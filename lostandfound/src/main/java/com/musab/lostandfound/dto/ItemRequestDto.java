package com.musab.lostandfound.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ItemRequestDto {

    private String itemName;

    private String description;

    private String location;

    private LocalDate eventDate;

    private Double latitude;

    private Double longitude;
}
