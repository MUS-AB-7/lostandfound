package com.musab.lostandfound.service.serviceImpl;

import com.musab.lostandfound.entity.Notification;
import com.musab.lostandfound.entity.User;
import com.musab.lostandfound.repository.NotificationRepository;
import com.musab.lostandfound.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    private final SimpMessagingTemplate simpMessagingTemplate;

    @Override
    public void sendNotification(User user, String message) {
        Notification notification = Notification.builder()
                .user(user)
                .message(message)
                .isRead(false)
                .timestamp(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);

        simpMessagingTemplate.convertAndSend(
                "/topic/notification/" + user.getId(),
                notification
        );
    }

    @Override
    public List<Notification> getUserNotifications(Long userId) {

        return notificationRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    @Override
    public void markAsRead(Long id) {

        Notification notification = notificationRepository.findById(id).orElseThrow();
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }
}
