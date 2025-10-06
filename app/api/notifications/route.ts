import { sql } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const result = await sql`
      SELECT 
        id,
        notification_id,
        package_id,
        message,
        notification_type,
        status,
        sent_at,
        created_at,
        recipient_phone
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 50
    `;

    if (!result || result.length === 0) {
      console.error("No notifications found");
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    const notifications = result.map(notification => {
      if (!notification) return null;
      
      return {
        ...notification,
        created_at: notification.created_at ? new Date(notification.created_at).toISOString() : null,
        sent_at: notification.sent_at ? new Date(notification.sent_at).toISOString() : null,
        read: notification.status === 'read'
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
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();

    if (data.markAllAsRead) {
      const result = await sql`
        UPDATE notifications 
        SET status = 'read' 
        RETURNING *
      `;

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

    const result = await sql`
      UPDATE notifications 
      SET status = 'read' 
      WHERE notification_id = ${data.notificationId} 
      RETURNING *
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
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
}