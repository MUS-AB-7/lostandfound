package com.musab.lostandfound.controller;

import com.musab.lostandfound.entity.Notification;
import com.musab.lostandfound.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@CrossOrigin("*")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/{userId}")
    public List<Notification> getNotifications(@PathVariable Long userId){
        return notificationService.getUserNotifications(userId);
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable Long id){
        notificationService.markAsRead(id);
    }

}
