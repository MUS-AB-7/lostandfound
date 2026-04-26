package com.musab.lostandfound.service.serviceImpl;

import com.musab.lostandfound.entity.Item;
import com.musab.lostandfound.repository.ItemRepository;
import com.musab.lostandfound.service.MatchingService;
import com.musab.lostandfound.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MatchingServiceImpl implements MatchingService {


    private final ItemRepository itemRepository;

    private final NotificationService notificationService;

    @Override
    public List<Item> findMatches(Item item) {

        List<Item> allItems = itemRepository.findAll();

        List<Item> matches = new ArrayList<>();

        for(Item other : allItems){
            if(other.getId().equals(item.getId())){
                continue;
            }

            double score = calculateSimilarity(item, other);

            if(score > 0.6){
                matches.add(other);
            }
        }

        notificationService.sendNotification(
                item.getReportedBy(),
                "We found a possible match for your item : " + item.getItemName()
        );

        return matches;
    }

    private double calculateSimilarity(Item a, Item b) {

        double nameScore = textSimilarity(a.getItemName(), b.getItemName());

        double descScore = textSimilarity(a.getDescription(), b.getDescription());

        double locationScore = textSimilarity(a.getLocation(), b.getLocation());

        return (nameScore * 0.5 + descScore * 0.5 + locationScore * 0.2);
    }

    private double textSimilarity(String s1, String s2) {

        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        Set<String> set1 = new HashSet<>(Arrays.asList(s1.split(" ")));
        Set<String> set2 = new HashSet<>(Arrays.asList(s2.split(" ")));

        Set<String> intersection = new HashSet<>(set1);
        intersection.retainAll(set2);

        Set<String> union = new HashSet<>(set1);
        union.addAll(set2);

        return (double) intersection.size() / union.size();
    }


}
