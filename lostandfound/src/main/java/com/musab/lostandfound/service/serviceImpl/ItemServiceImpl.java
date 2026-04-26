package com.musab.lostandfound.service.serviceImpl;

import com.musab.lostandfound.dto.ItemRequestDto;
import com.musab.lostandfound.dto.ItemResponseDto;
import com.musab.lostandfound.entity.Item;
import com.musab.lostandfound.entity.User;
import com.musab.lostandfound.repository.ItemRepository;
import com.musab.lostandfound.repository.UserRepository;
import com.musab.lostandfound.service.ItemService;
import com.musab.lostandfound.service.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemServiceImpl implements ItemService {

    private final ItemRepository itemRepository;

    private final S3Service s3Service;

    private final UserRepository userRepository;

    @Override
    public ItemResponseDto reportLost(ItemRequestDto dto, MultipartFile image) {

        String imageUrl = s3Service.uploadFile(image);

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmail(email).orElseThrow();

        Item item = Item.builder()
                .itemName(dto.getItemName())
                .description(dto.getDescription())
                .location(dto.getLocation())
                .eventDate(dto.getEventDate())
                .status("LOST")
                .imageUrl(imageUrl)
                .reportedBy(user)
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .build();

        itemRepository.save(item);

        return map(item);
    }

    @Override
    public ItemResponseDto reportFound(ItemRequestDto dto, MultipartFile image) {

        String imageUrl = s3Service.uploadFile(image);

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmail(email).orElseThrow();

        Item item = Item.builder()
                .itemName(dto.getItemName())
                .description(dto.getDescription())
                .location(dto.getLocation())
                .eventDate(dto.getEventDate())
                .status("FOUND")
                .imageUrl(imageUrl)
                .reportedBy(user)
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .build();

        itemRepository.save(item);

        return map(item);
    }

    @Override
    public List<ItemResponseDto> getAllItems() {
        return itemRepository.findAll()
                .stream()
                .map(this::map)
                .toList();
    }

    @Override
    public ItemResponseDto claimItem(long id) {

        Item item = itemRepository.findById(id).orElseThrow();

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmail(email).orElseThrow();

        item.setStatus("CLAIMED");
        item.setClaimedBy(user);

        itemRepository.save(item);

        return map(item);
    }

    private ItemResponseDto map(Item item) {
        return ItemResponseDto.builder()
                .id(item.getId())
                .itemName(item.getItemName())
                .description(item.getDescription())
                .location(item.getLocation())
                .eventDate(item.getEventDate())
                .status(item.getStatus())
                .imageUrl(item.getImageUrl())
                .reportedBy(item.getReportedBy().getEmail())
                .claimedBy(
                        item.getClaimedBy() == null
                        ? null
                        : item.getClaimedBy().getEmail()
                )
                .latitude(item.getLatitude())
                .longitude(item.getLongitude())
                .build();

    }
}
