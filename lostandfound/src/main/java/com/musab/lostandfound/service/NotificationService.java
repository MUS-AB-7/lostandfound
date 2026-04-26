package com.musab.lostandfound.service;

import com.musab.lostandfound.entity.Notification;
import com.musab.lostandfound.entity.User;

import java.util.List;

public interface NotificationService {

    void sendNotification(User user, String message);

    List<Notification> getUserNotifications(Long userId);

    void markAsRead(Long id);
}
