package com.musab.lostandfound.repository;

import com.musab.lostandfound.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByTimestampDesc(Long userId);
}
