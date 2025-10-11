import { sql } from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type AuthUser } from "@/lib/auth-middleware";

export const GET = requireAuth(async (request: NextRequest, user: AuthUser) => {
  try {
let query = sql`
  SELECT
    n.id,
    n.notification_id,
    n.package_id,
    n.message,
    n.notification_type,
    n.status,
    n.sent_at,
    n.created_at,
    n.recipient_phone,
    p.origin_branch_id as package_branch_id
  FROM notifications n
  LEFT JOIN packages p ON n.package_id = p.package_id
`;

    // Filter for agents: only notifications for their branch
    if (user.role === "agent" && user.branch_id) {
      query = sql`
        ${query}
        WHERE p.origin_branch_id = ${user.branch_id}
      `;
    }
    // For admins, no additional filter (all notifications)
    // For customers, could add user-specific filter if needed, but page is for admin/agent

    query = sql`
      ${query}
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    const result = await query;

    if (!result || result.length === 0) {
      console.log("No notifications found for user");
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    const notifications = result.map(notification => {
      if (!notification) return null;
      
      // Derive title based on notification_type for better UX
      let title = "System Notification";
      switch (notification.notification_type) {
        case "sms":
          title = "SMS Notification";
          break;
        case "package_update":
          title = "Package Update";
          break;
        case "payment_confirmation":
          title = "Payment Confirmation";
          break;
        case "delivery_alert":
          title = "Delivery Alert";
          break;
        default:
          title = notification.notification_type.replace(/_/g, " ").toUpperCase();
      }

      // Map fields for component compatibility
      return {
        ...notification,
        title: title,
        type: notification.notification_type, // Use notification_type as type
        is_read: notification.status === 'read',
        tracking_number: notification.package_id, // Assume package_id is tracking number
        created_at: notification.created_at ? new Date(notification.created_at).toISOString() : null,
        sent_at: notification.sent_at ? new Date(notification.sent_at).toISOString() : null,
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
});

export const PATCH = requireAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const data = await request.json();

    if (data.markAllAsRead) {
      let updateQuery = sql`
        UPDATE notifications
        SET status = 'read'
        RETURNING *
      `;

      // For agents, only mark their branch's notifications as read
      if (user.role === "agent" && user.branch_id) {
        updateQuery = sql`
          UPDATE notifications n
          SET status = 'read'
          FROM packages p
          WHERE n.package_id = p.package_id
            AND p.origin_branch_id = ${user.branch_id}
          RETURNING n.*
        `;
      }

      const result = await updateQuery;

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
        notifications: result
      });
    }

    if (!data.notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // For single notification, check if it belongs to the user's branch if agent
    let whereClause = sql`WHERE notification_id = ${data.notificationId}`;
    if (user.role === "agent" && user.branch_id) {
      whereClause = sql`
        WHERE notification_id = ${data.notificationId}
          AND EXISTS (
            SELECT 1 FROM packages p
            WHERE p.package_id = notifications.package_id
              AND p.origin_branch_id = ${user.branch_id}
          )
      `;
    }

    const result = await sql`
      UPDATE notifications
      SET status = 'read'
      ${whereClause}
      RETURNING *
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
      notification: result[0]
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification" },
      { status: 500 }
    );
  }
});
