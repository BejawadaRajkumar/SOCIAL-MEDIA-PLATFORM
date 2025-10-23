package com.chat.microservice.service;

import com.chat.microservice.model.Message;
import com.chat.microservice.model.User;
import com.chat.microservice.repository.MessageRepository;
import com.chat.microservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    public String syncUser(Map<String, Object> userData) {
        try {
            String email = (String) userData.get("email");
            if (email == null) {
                return "400::Email is required";
            }

            User user = userRepository.findByEmail(email);
            if (user == null) {
                user = new User();
                user.setEmail(email);
            }

            user.setFullName((String) userData.get("fullName"));
            user.setProfilePic((String) userData.get("profilePic"));

            List<Map<String, String>> followers = (List<Map<String, String>>) userData.get("followers");
            List<User.UserReference> followerRefs = followers.stream()
                .map(f -> {
                    User.UserReference ref = new User.UserReference();
                    ref.setEmail(f.get("email"));
                    ref.setFullName(f.get("fullName"));
                    return ref;
                })
                .collect(Collectors.toList());
            user.setFollowers(followerRefs);

            List<Map<String, String>> following = (List<Map<String, String>>) userData.get("following");
            List<User.UserReference> followingRefs = following.stream()
                .map(f -> {
                    User.UserReference ref = new User.UserReference();
                    ref.setEmail(f.get("email"));
                    ref.setFullName(f.get("fullName"));
                    return ref;
                })
                .collect(Collectors.toList());
            user.setFollowing(followingRefs);

            userRepository.save(user);
            return "200::User synced successfully";
        } catch (Exception e) {
            return "500::Error syncing user: " + e.getMessage();
        }
    }

    public List<Message> getMessages(String userEmail, String otherEmail) {
        return messageRepository.findBySenderEmailAndReceiverEmailOrReceiverEmailAndSenderEmail(
            userEmail, otherEmail, otherEmail, userEmail);
    }

    public void saveMessage(Message message) {
        messageRepository.save(message);
    }
}