"use client"

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Bell, CheckCircle2, Mail, Package, Shield, Truck, User } from "lucide-react";
import { useState } from "react";

interface NotificationCardProps {
  id: string;
  notification_id: string;
  package_id?: string;
  message: string;
  notification_type?: string;
  status: string;
  sent_at?: string;
  created_at: string;
  recipient_phone?: string;
  onRead?: (id: string) => void;
}

const NotificationCard = ({
  id,
  notification_id,
  package_id,
  message,
  notification_type,
  status,
  sent_at,
  created_at,
  recipient_phone,
  onRead
}: NotificationCardProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'read' || !onRead || isLoading) return;
    
    setIsLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: notification_id }),
      });
      onRead(notification_id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    const notificationType = (notification_type || 'system').toLowerCase();
    
    switch (notificationType) {
      case 'delivery':
        return <Truck className="h-4 w-4 text-green-600" />;
      case 'package':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'system':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'user':
        return <User className="h-4 w-4 text-indigo-600" />;
      case 'sms':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeColor = () => {
    const notificationType = (notification_type || 'system').toLowerCase();
    
    switch (notificationType) {
      case 'delivery':
        return "bg-green-100 text-green-800 border-green-200";
      case 'package':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'system':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'alert':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'user':
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'sms':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'email':
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Recently';
    }
  };

  const getNotificationTitle = () => {
    if (package_id) return `Package ${package_id}`;
    
    const notificationType = (notification_type || 'system').toLowerCase();
    switch (notificationType) {
      case 'delivery':
        return 'Delivery Update';
      case 'package':
        return 'Package Status';
      case 'system':
        return 'System Notification';
      case 'alert':
        return 'Important Alert';
      case 'user':
        return 'User Activity';
      case 'sms':
        return 'SMS Notification';
      case 'email':
        return 'Email Notification';
      default:
        return 'Notification';
    }
  };

  return (
    <div
      onClick={handleMarkAsRead}
      className={cn(
        "group relative p-4 transition-all duration-200 cursor-pointer border-l-4",
        status === 'read'
          ? "bg-white border-l-transparent hover:bg-gray-50" 
          : "bg-blue-50/50 border-l-blue-500 hover:bg-blue-100/50",
        isLoading && "opacity-60 pointer-events-none"
      )}
    >
      {/* Unread indicator */}
      {status !== 'read' && (
        <div className="absolute top-4 left-2 w-2 h-2 bg-blue-500 rounded-full" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          status === 'read' ? "bg-gray-100" : "bg-white shadow-sm"
        )}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={cn(
                  "text-sm font-semibold truncate",
                  status === 'read' ? "text-gray-900" : "text-gray-900"
                )}>
                  {getNotificationTitle()}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs font-medium", getTypeColor())}
                >
                  {notification_type || 'System'}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                {message}
              </p>

              {recipient_phone && (
                <p className="text-xs text-gray-500">
                  To: {recipient_phone}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {status !== 'read' && (
                <button
                  onClick={handleMarkAsRead}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              {formatDate(created_at)}
            </span>
            {status !== 'read' && !isLoading && (
              <span className="text-xs font-medium text-blue-600">
                Unread
              </span>
            )}
            {isLoading && (
              <span className="text-xs text-gray-500">
                Updating...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;