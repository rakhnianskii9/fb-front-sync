import React, { useState, useEffect, useCallback } from 'react';
import logger from "@/lib/logger";
import { Bell, Check, CheckCheck, Trash2, RefreshCcw, AlertCircle, Clock, X, Rocket, Pause, Play, FileCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { notificationsApi, Notification } from '@/api/fbAds';

interface NotificationBellProps {
  workspaceId: string;
  className?: string;
}

/**
 * Иконки для типов уведомлений
 */
const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
  switch (type) {
    case 'sync_complete':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'sync_failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'initial_sync_started':
      return <Rocket className="h-4 w-4 text-blue-500" />;
    case 'initial_sync_paused':
      return <Pause className="h-4 w-4 text-yellow-500" />;
    case 'report_ready':
      return <FileCheck className="h-4 w-4 text-green-500" />;
    case 'initial_sync_resumed':
      return <Play className="h-4 w-4 text-blue-500" />;
    case 'incremental_sync':
      return <RefreshCcw className="h-4 w-4 text-blue-500" />;
    case 'deadline_approaching':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'deadline_overdue':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

/**
 * Колокольчик уведомлений с выпадающим списком
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({ workspaceId, className }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Загрузка уведомлений
   */
  const fetchNotifications = useCallback(async (checkDeadlines = false) => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const response = await notificationsApi.getAll(workspaceId, {
        limit: 20,
        checkDeadlines
      });
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  /**
   * Первичная загрузка с проверкой дедлайнов
   */
  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  /**
   * Периодическое обновление счётчика (каждые 15 сек)
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!workspaceId) return;
      try {
        const { unreadCount: count } = await notificationsApi.getUnreadCount(workspaceId);
        setUnreadCount(count);
      } catch (error) {
        logger.error('Failed to fetch unread count:', error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [workspaceId]);

  /**
   * Пометить как прочитанное
   */
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(workspaceId, id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  };

  /**
   * Пометить все как прочитанные
   */
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead(workspaceId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  /**
   * Удалить уведомление
   */
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(workspaceId, id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      logger.error('Failed to delete notification:', error);
    }
  };

  /**
   * Обработка открытия/закрытия дропдауна
   */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // При открытии — обновляем уведомления
    if (open) {
      fetchNotifications(false);
    }
  };

  /**
   * Обработка клика на уведомление
   */
  const handleNotificationClick = (notification: Notification) => {
    // Если это дедлайн — можно навигировать на заметку
    if (notification.data?.noteId && (notification.type === 'deadline_approaching' || notification.type === 'deadline_overdue')) {
      // TODO: Navigate to note
      logger.log('Navigate to note:', notification.data.noteId);
    }

    // Помечаем как прочитанное
    if (!notification.isRead) {
      notificationsApi.markAsRead(workspaceId, notification.id).then(() => {
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fetchNotifications(true)}
              disabled={isLoading}
            >
              <RefreshCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'px-3 py-2 cursor-pointer hover:bg-muted/50 border-b last:border-b-0',
                  !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    {/* Показываем имя воркспейса для глобальных уведомлений */}
                    {notification.isGlobal && notification.sourceWorkspaceName && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {notification.sourceWorkspaceName}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Delete"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
