package com.musab.lostandfound.controller;

import com.musab.lostandfound.dto.ClaimResponseDto;
import com.musab.lostandfound.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/claims")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ClaimController {

    private final ClaimService claimService;

    @PostMapping("/{itemId}")
    public ClaimResponseDto requestClaim(@PathVariable Long itemId){
        return claimService.requestClaim(itemId);
    }

    @PostMapping("/{claimId}/approve")
    public ClaimResponseDto approve(@PathVariable Long claimId){
        return claimService.approveClaim(claimId);
    }

    @PostMapping("/{claimId}/reject")
    public ClaimResponseDto reject(@PathVariable Long claimId){
        return claimService.rejectClaim(claimId);
    }

    @GetMapping
    public List<ClaimResponseDto> getClaims(){
        return claimService.getClaimsForUser();
    }

}
