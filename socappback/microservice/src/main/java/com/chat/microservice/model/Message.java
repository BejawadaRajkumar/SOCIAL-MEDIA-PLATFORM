package com.chat.microservice.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Data
@Document(collection = "messages")
public class Message {
    @Id
    private String id;
    private String senderEmail;
    private String receiverEmail;  // This field must exist for getReceiverEmail() to work
    private String content;
    private Date timestamp = new Date();
    private boolean read = false;
}