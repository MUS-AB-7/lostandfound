package com.musab.lostandfound.repository;


import com.musab.lostandfound.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimRepository extends JpaRepository<Claim, Long> {
}
