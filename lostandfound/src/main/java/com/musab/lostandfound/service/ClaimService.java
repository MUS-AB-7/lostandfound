package com.musab.lostandfound.service;


import com.musab.lostandfound.dto.ClaimResponseDto;

import java.util.List;

public interface ClaimService {

    ClaimResponseDto requestClaim(Long itemId);

    ClaimResponseDto approveClaim(Long claimId);

    ClaimResponseDto rejectClaim(Long claimId);

    List<ClaimResponseDto> getClaimsForUser();
}
