package com.fsad.model;

import jakarta.persistence.*;

@Entity
@Table(name = "userst")
public class User {
	@Column(name = "Full Name")
	String fullname;
	@Id 
	@Column(name = "E-mail Id")
	String email;
	
	@Column(name = "Password")
	String password;
	public String getFullname() {
		return fullname;
	}
	public void setFullname(String fullname) {
		this.fullname = fullname;
	}
	public String getEmail() {
		return email;
	}
	public void setEmail(String email) {
		this.email = email;
	}
	
	public String getPassword() {
		return password;
	}
	public void setPassword(String password) {
		this.password = password;
	}
	@Override
	public String toString() {
		return "Users [fullname=" + fullname + ", email=" + email + ", password=" + password + "]";
	}

	
   
}
