package com.musab.lostandfound.service;

import com.musab.lostandfound.entity.Item;

import java.util.List;

public interface MatchingService {

    List<Item> findMatches(Item item);
}
