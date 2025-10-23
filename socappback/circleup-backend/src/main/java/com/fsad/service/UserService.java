package com.fsad.service;

import com.fsad.model.User;
import com.fsad.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class UserService {
	@Autowired
	UserRepository UR;
	public String addUSer(User U) 
	 {  
		 if(UR.validateEmail(U.getEmail())>0)
		  return "401::email id already exits";
		 
		 UR.save(U);
	     return "200::Registration done successfully"; 
	     }
}
