import React, { Component } from "react";
import { BaseUrl, callApi, setSession } from "./api";
import "./App.css";

class App extends Component {
  constructor()
    {
        super();
        
        this.forgetPassword=this.forgetPassword.bind(this);
        
    }
  state = {
    showLoginModal: false,
    showSignupModal: false,
  };

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown = (event) => {
    if (event.key === "Escape") {
      this.setState({ showLoginModal: false, showSignupModal: false });
      document.body.style.overflow = "auto";
    }
  };

  toggleLoginModal = () => {
    this.setState((prevState) => ({ showLoginModal: !prevState.showLoginModal }));
    document.body.style.overflow = this.state.showLoginModal ? "auto" : "hidden";
  };

  toggleSignupModal = () => {
    this.setState((prevState) => ({ showSignupModal: !prevState.showSignupModal }));
    document.body.style.overflow = this.state.showSignupModal ? "auto" : "hidden";
  };

  closeModalOnOutsideClick = (event, modalType) => {
    if (event.target.classList.contains("modal")) {
      this.setState({ [modalType]: false });
      document.body.style.overflow = "auto";
    }
  };

  signup = () => {
    let fullName = document.getElementById("signup-fullname");
    let email = document.getElementById("signup-email");
    let password = document.getElementById("signup-password");
    let confirmPassword = document.getElementById("signup-confirm-password");

    fullName.style.border = "";
    email.style.border = "";
    password.style.border = "";
    confirmPassword.style.border = "";

    if (fullName.value === "") {
      fullName.style.border = "1px solid red";
      fullName.focus();
      return;
    }
    if (email.value === "") {
      email.style.border = "1px solid red";
      email.focus();
      return;
    }
    if (password.value === "") {
      password.style.border = "1px solid red";
      password.focus();
      return;
    }
    if (password.value !== confirmPassword.value) {
      confirmPassword.style.border = "1px solid red";
      confirmPassword.focus();
      return;
    }

    let data = JSON.stringify({
      fullname: fullName.value,
      email: email.value,
      password: password.value,
    });

    callApi("POST", BaseUrl + "users/signup", data, this.signupResponse);
  };

  signupResponse = (res) => {
    let resp = res.split("::");
    alert(resp[1]);
    if (resp[0] === "200") {
      this.setState({ showSignupModal: false, showLoginModal: true });
    }
  };

  login = () => {
    let email = document.getElementById("login-email");
    let password = document.getElementById("login-password");

    email.style.border = "";
    password.style.border = "";

    if (email.value === "") {
      email.style.border = "1px solid red";
      email.focus();
      return;
    }
    if (password.value === "") {
      password.style.border = "1px solid red";
      password.focus();
      return;
    }

    let data = JSON.stringify({
      email: email.value,
      password: password.value,
    });

    callApi("POST", BaseUrl + "users/login", data, this.loginResponse);
  };

  loginResponse = (res) => {
    console.log("Raw backend login response:", res);
  
    let resp = res.split("::");
    console.log("Parsed status:", resp[0]);
    console.log("Parsed data/token:", resp[1]);
  
    if (resp[0] === "200") {
      setSession("userSession", resp[1], 1);
      window.location.replace("/dashboard");
    } else {
      alert(resp[1]);
    }
  };
  

  forgetPassword()
  {
     username.style.border="";
     if(username.value==="")
     {
         username.style.border="1px solid red";
         username.focus();
         return;
     }
     let url="http://localhost:8057/users/forgetpassword/"+username.value;
      callApi("GET",url,"",this.forgetpasswordResponse);
  }
  forgetpasswordResponse(res)
  {
    let data=res.split('::');
    if(data[0]==="200")
    {
     responseDiv1.innerHTML=`<br/><br/><br/><br/><br/><label style='color:green'>${data[1]}<label/>`; 

    }
    else
    {
     responseDiv1.innerHTML=`<br/><br/><label style='color:red'>${data[1]}<label/>`;
    }
  }

  render() {
    return (
      <div className="app-container">
        <header className="header">
          <div className="logo-container">
            <img className="logoicon" src="/logoicon.png" alt="Logo" />
            <label className="logo-text">Circle Up</label>
          </div>
          <div className="auth-buttons">
            <button className="login-btn" onClick={this.toggleLoginModal}>Login</button>
            <button className="signup-btn" onClick={this.toggleSignupModal}>Signup</button>
          </div>
        </header>

        <main className="content">
          <video className="background-video" src="/convideo.mp4" autoPlay loop muted></video>
          <div className="content-overlay">
            <p>Welcome to the Social Media App!</p>
          </div>
        </main>

        <footer className="footer">
          <p>&copy; 2025 Social Media App. All rights reserved.</p>
        </footer>

        {/* Login Modal */}
        {this.state.showLoginModal && (
          <div className="modal login-modal" onClick={(e) => this.closeModalOnOutsideClick(e, "showLoginModal")}>
            <div className="modal-content">
              <div className="login-modal-left">
                <img className="modal-logo" src="/logoicon.png" alt="Logo" />
                <h2 className="modal-title">Circle Up</h2>
              </div>
              <div className="login-modal-right">
                <h3>Login</h3>
                <input type="email" id="login-email" placeholder="Email" className="input-field" autoFocus />
                <input type="password" id="login-password" placeholder="Password" className="input-field" />

                <div className="forgot-password-container">
                  <a href="#" className="forgot-password-link" onClick={this.forgetPassword}>
                    Forgot Password?
                  </a>
                </div>

                <button className="modal-login-btn" onClick={this.login}>Login</button>
              </div>
            </div>
          </div>
        )}

        {/* Signup Modal */}
        {this.state.showSignupModal && (
          <div className="modal signup-modal" onClick={(e) => this.closeModalOnOutsideClick(e, "showSignupModal")}>
            <div className="modal-content">
              <div className="signup-modal-left">
                <img className="modal-logo" src="/logoicon.png" alt="Logo" />
                <h2 className="modal-title">Circle Up</h2>
              </div>
              <div className="signup-modal-right">
                <h3>Signup</h3>
                <input type="text" id="signup-fullname" placeholder="Full Name" className="input-field" autoFocus />
                <input type="email" id="signup-email" placeholder="Email" className="input-field" />
                <input type="password" id="signup-password" placeholder="Password" className="input-field" />
                <input type="password" id="signup-confirm-password" placeholder="Confirm Password" className="input-field" />
                <button className="modal-signup-btn" onClick={this.signup}>Signup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;
