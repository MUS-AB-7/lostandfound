package com.musab.lostandfound.service.serviceImpl;

import com.musab.lostandfound.dto.ClaimResponseDto;
import com.musab.lostandfound.entity.Claim;
import com.musab.lostandfound.entity.Item;
import com.musab.lostandfound.entity.User;
import com.musab.lostandfound.repository.ClaimRepository;
import com.musab.lostandfound.repository.ItemRepository;
import com.musab.lostandfound.repository.UserRepository;
import com.musab.lostandfound.service.ClaimService;
import com.musab.lostandfound.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClaimServiceImpl implements ClaimService {

    private final ClaimRepository claimRepository;

    private final ItemRepository itemRepository;

    private final UserRepository userRepository;

    private final NotificationService notificationService;


    @Override
    public ClaimResponseDto requestClaim(Long itemId) {

        Item item = itemRepository.findById(itemId).orElseThrow();

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmail(email).orElseThrow();

        Claim claim = Claim.builder()
                .item(item)
                .claimant(user)
                .status("PENDING")
                .build();

        claimRepository.save(claim);

        notificationService.sendNotification(
                item.getReportedBy(),
                "Someone requested to claim your item: " + item.getItemName()
        );


        return map(claim);
    }

    @Override
    public ClaimResponseDto approveClaim(Long claimId) {

        Claim claim = claimRepository.findById(claimId).orElseThrow();

        claim.setStatus("APPROVED");

        Item item = claim.getItem();
        item.setStatus("CLAIMED");
        item.setClaimedBy(claim.getClaimant());

        claimRepository.save(claim);
        itemRepository.save(item);

        notificationService.sendNotification(
                claim.getClaimant(),
                "Your claim was approved for item : " + claim.getItem().getItemName()
        );

        return map(claim);
    }

    @Override
    public ClaimResponseDto rejectClaim(Long claimId) {

        Claim claim = claimRepository.findById(claimId).orElseThrow();

        claim.setStatus("REJECTED");

        claimRepository.save(claim);

        notificationService.sendNotification(
                claim.getClaimant(),
                "You claim was rejected for the item " + claim.getItem().getItemName()
        );

        return map(claim);
    }

    @Override
    public List<ClaimResponseDto> getClaimsForUser() {

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return claimRepository.findAll()
                .stream()
                .filter(c -> c.getItem().getReportedBy().getEmail().equals(email))
                .map(this::map)
                .toList();
    }

    private ClaimResponseDto map(Claim claim){
        return ClaimResponseDto.builder()
                .id(claim.getId())
                .itemName(claim.getItem().getItemName())
                .claimantEmail(claim.getClaimant().getEmail())
                .status(claim.getStatus())
                .build();
    }
}
