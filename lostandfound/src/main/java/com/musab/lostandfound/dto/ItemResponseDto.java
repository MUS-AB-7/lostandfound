package com.musab.lostandfound.dto;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class ItemResponseDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemName;

    private String description;

    private String location;

    private LocalDate eventDate;

    private String status;

    private String imageUrl;

    private String reportedBy;

    private String claimedBy;

    private Double latitude;

    private Double longitude;
}
