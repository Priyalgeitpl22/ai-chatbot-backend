(function (global) {
  const ChatWidget = {
    globalStylesInjected: false,
    userName: "",
    userEmail: "",
    collectUserInfoState: "none",
    pendingUserMessage: null,
    threadId: null,
    chatHistory: [],

    async init(options) {
      // const response = await fetch(
      //   `${"http://localhost:5003"}/api/chat/config?orgId=${options.orgId}`
      // );
      const response = await fetch(`https://api.chat.jooper.ai/api/chat/config?orgId=${options.orgId}`);

      const data = await response.json();

      const defaultOptions = {
        elementId: "chat-widget",
        apiEndpoint: data.data?.socketServer,
        allowFileUpload: data.data?.allowFileUpload,
        addInitialPopupText: data.data?.addInitialPopupText,
        addChatBotName: data.data?.addChatBotName,
        ChatBotLogoImage: data.data?.ChatBotLogoImage,
        allowNameEmail: data.data?.allowNameEmail,
        allowCustomGreeting: data.data?.allowCustomGreeting,
        customGreetingMessage: data.data?.customGreetingMessage,
        allowFontFamily: data.data?.allowFontFamily,
        customFontFamily: data.data?.customFontFamily,
        allowEmojis: data.data?.allowEmojis,
        position: data.data?.position,
        orgId: data.data?.aiOrgId,
        aiEnabled: data.data?.aiEnabled,
        iconColor: data.data?.iconColor,
        chatWindowColor: data.data?.chatWindowColor,
        fontColor: data.data?.fontColor,
        availability: data.data?.availability,
        socketServer: data.data?.socketServer,
      };
      this.options = { ...defaultOptions };
      this.container = document.getElementById(this.options.elementId);
      if (!this.container) {
        return;
      }
      this.socket = io(this.options.socketServer);
      this.onlinAgents = [];
      this.injectGlobalStyles();
      this.renderIcon();
    },

    getPositionStyles() {
      return this.options.position === "bottom-left"
        ? "left: 10px; bottom: 10px;"
        : "right: 10px; bottom: 10px;";
    },

    injectStyle(cssText) {
      const style = document.createElement("style");
      style.innerHTML = cssText;
      document.head.appendChild(style);
    },

    injectGlobalStyles() {
      if (this.globalStylesInjected) return;
      const fontFamily = this.options.allowFontFamily
        ? `${this.options.customFontFamily}, sans-serif`
        : `Arial, sans-serif`;
      const position =
        this.options.position === "bottom-left"
          ? "left: 20px;"
          : "right: 20px;";
      const css = `
          /* Global Styles */
          .chat-icon:hover { opacity: 0.8; }
          .chat-widget {font-family: ${fontFamily} !important; position: fixed; border: 1px solid #ddd; border-radius: 5px; width: 380px; height: 550px; display: flex; flex-direction: column; }
          .chat-header { color: white; border-radius: 5px 5px 0 0; }
          .chat-messages { flex: 1; overflow-y: scroll; scrollbar-width: none; -ms-overflow-style: none; padding: 10px; border-top: 1px solid #ddd; display: flex; flex-direction: column; }
          .chat-messages::-webkit-scrollbar { display: none; }
          .message { padding: 8px 10px; max-width: 80%; margin-top: 5px; display: inline-block; position: relative; }
          .message.agent { background-color: #e9ecef; color: #000; border-radius: 10px 10px 10px 0px; align-self: flex-start; }
          .message.user { background-color: ${
            this.options.iconColor
          }; color: #fff !important; border-radius: 10px 10px 0px 10px; align-self: flex-end; word-break: break-all; }
          .chat-input-container { display: flex; padding: 10px; gap: 5px; position: relative;}
          #chat-input { flex: 1; resize: none; border-radius: 5px; padding: 5px; overflow: auto; }
          #chat-input::-webkit-scrollbar { display: none; }
          .chat-actions { display: flex; }
          .chat-actions button { cursor: pointer; color: white; border: none; border-radius: 5px; padding: 5px; background: none; opacity: 0.7; }
          .chat-actions button:hover { opacity: 0.8; }
          .contact-form { padding: 10px; display: flex; flex-direction: column; align-items: center; }
          .contact-form input, .contact-form textarea { width: 100%; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #fafafa; font-size: 14px; transition: border-color 0.3s, box-shadow 0.3s; }
          .contact-form input:focus, .contact-form textarea:focus { border-color: #667eea; box-shadow: 0 0 5px rgba(102,126,234,0.5); outline: none; }
          .contact-form button { width: 100%; color: #fff; background: ${this.options.iconColor
        }; border: none; border-radius: 5px; padding: 10px; font-size: 16px; cursor: pointer; opacity: 0.8; transition: background 0.3s; }
          .contact-form button:hover { opacity: 1; background: ${this.options.iconColor
        }; }
          .emoji-picker { cursor: pointer; }
          .emoji-picker-container { position: absolute; bottom: 70px; ${position} z-index: 9999; display: none; border: 1px solid #ccc; border-radius: 5px; width: 340px; height: 200px; overflow: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
          .emoji-picker-container #shadow-root .picker .favorites { display: none; }
          textarea { border: none; }
          textarea:focus { outline: none; border: none; }
          .chat-input-wrapper { display: flex; width: 100%; padding: 3px 5px; border: 1px solid #ddd; border-radius: 5px; }
          .message.agent.loading .typing-indicator { display: flex; align-items: center; }
          .message.agent.loading .typing-indicator span { background-color: #ccc; border-radius: 50%; width: 8px; height: 8px; margin: 0 2px; animation: typing 1s infinite; }
          .message.agent.loading .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
          .message.agent.loading .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typing { 0% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } 100% { opacity: 0.2; transform: translateY(0); } }
          .message ul { margin: 5px 0; padding-left: 20px; list-style-type: disc; }
          .message li { margin-bottom: 5px; }
          .message ol { padding-left: 20px; list-style-type: none; counter-reset: custom-counter; }
          .message ol li { position: relative; margin-bottom: 12px; padding-left: 30px; font-size: 14px; color: #444; counter-increment: custom-counter; line-height: 1.5; }
          .message ol li:before { content: counter(custom-counter) "."; position: absolute; left: 0; font-weight: bold; color: ${this.options.iconColor || "#007bff"
        }; }
          .point-title { font-weight: 600; color: #555; margin-right: 5px; }
          .message p { margin: 5px 0; line-height: 1.5;}
          .message.agent p {color: black !important;}
          .message.user p {color: white !important;}
          .message-card { background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); padding: 8px 10px; max-width: 90%; }
          .message-card.agent { background-color: #f9f9f9; }
          .message-content { font-size: 14px; } p { color: white; }
          .message-table-wrapper { margin: 10px 0; overflow-x: auto; }
          .message-table-wrapper table.info-table { width: 100%; border-collapse: separate; border-spacing: 0; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
          .message-table-wrapper th, .message-table-wrapper td { padding: 12px 15px; text-align: left; font-size: 13px; border-bottom: 1px solid #e5e5e5; }
          .message-table-wrapper th { background: linear-gradient(135deg, ${this.options.iconColor || "#007bff"
        } 0%, ${this.options.iconColor || "#0056b3"
        } 100%); color: #fff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ffffff33; }
          .message-table-wrapper td { color: #444; }
          .message-table-wrapper td.row-heading { background-color: #f5f5f5; font-weight: 500; color: #333; }
          .message-table-wrapper tr:nth-child(even) td:not(.row-heading) { background-color: #fafafa; }
          .message-table-wrapper tr:hover td { background-color: #f0f0f0; transition: background-color 0.2s ease; }
          .message-table-wrapper a { color: ${this.options.iconColor || "#007bff"
        }; text-decoration: none; font-weight: 500; }
          .message-table-wrapper a:hover { text-decoration: underline; color: ${this.options.iconColor || "#0056b3"
        }; }
          .suggestions-container {
  display: flex;
  height:35px;
  flex-wrap: nowrap;
  overflow-x: auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}

.suggestions-container::-webkit-scrollbar {
  display: none;             /* Chrome, Safari, Opera */
}

.suggestion {
  white-space: nowrap;
  background-color: #e0e0e0;
  border: none;
  border-radius: 20px;
  padding: 2px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion:hover {
  background-color: #d0d0d0;
  
}#suggestion-box-container {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #f5f5f5;

}

#contact-form-container {
  position: relative;
  background: #fff;
  border-radius: 10px;
  padding: 20px 16px 16px;
  box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.15);
  animation: popupFadeIn 0.25s ease;
  font-family: sans-serif;
}

#close-contact-form {
  position: absolute;
  top: -3px;
  right: 12px;
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
  color: #555;
  text-align: right;
}

/* Title in center, one line */
.form-title {
  text-align: center;
  font-size: 16px;
  margin: 0 0 20px 0;
  font-weight: bold;
}
#contact-form-container input,
#contact-form-container textarea {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 14px;
}

#contact-form-container textarea {
  resize: vertical;
  min-height: 60px;
  max-height: 100px;
}

#submit-contact {
  background-color: ${this.options.iconColor};
  color: #fff;
  border: none;
  padding-block: 8px;
  width: 100%;
  font-weight: bold;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

#submit-contact:hover {
  background-color: ${this.options.iconColor};
}

@keyframes popupFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

        `;
      this.injectStyle(css);
      this.globalStylesInjected = true;
    },

    // Helper function to store the user message in UI and send it to backend.
    storeUserMessage(content) {
      this.appendMessage("User", content);
      if (this.threadId) {
        this.socket.emit("sendMessage", {
          sender: "User",
          content,
          threadId: this.threadId,
          aiOrgId: this.options.orgId,
          aiEnabled: this.options.aiEnabled,
          allowNameEmail: this.options.allowNameEmail,
          createdAt: Date.now(),
        });
      }
    },

    // Helper function to store a bot message.
    storeBotMessage(content) {
      this.appendMessage("ChatBot", content);
      if (this.threadId) {
        this.socket.emit("sendMessage", {
          sender: "Bot",
          content,
          threadId: this.threadId,
          aiOrgId: this.options.orgId,
          aiEnabled: this.options.aiEnabled,
          allowNameEmail: this.options.allowNameEmail,
          createdAt: Date.now(),
        });
      }
    },

    renderIcon() {
      const positionStyles = this.getPositionStyles();
      const isBottomRight = this.options.position === "bottom-right";
      this.container.innerHTML = `
          <div class="chat-container ${isBottomRight ? "bottom-right" : "bottom-left"
        }" style="position: fixed; ${positionStyles}; display: flex; align-items: center;">
            <div class="chat-icon" style="cursor: pointer; background-color: ${this.options.iconColor
        }; color: white; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
              💬
            </div>
            <div class="chat-message" id="chat-message" style="background: white; color: black; padding: 8px 12px; border-radius: 15px; box-shadow: 0px 2px 5px rgba(0,0,0,0.2); ${isBottomRight ? "margin-left: 10px;" : "margin-right: 10px;"
        } font-size: 14px; display: none; align-items: center;">
              ${this.options.addInitialPopupText ||
        "Hello and welcome to GoldenBot 👋"
        }
              <button id="close-message" style="background: none; border: none; font-size: 16px; ${isBottomRight ? "margin-right: 8px;" : "margin-left: 8px;"
        } cursor: pointer;">&times;</button>
            </div>
          </div>
        `;
      if (isBottomRight) {
        this.container.querySelector(".chat-container").style.flexDirection =
          "row-reverse";
      }
      this.container
        .querySelector(".chat-icon")
        .addEventListener("click", () => this.renderChatWindow());
      document.getElementById("close-message").addEventListener("click", () => {
        document.getElementById("chat-message").style.display = "none";
      });
      setTimeout(() => {
        const chatMessage = document.getElementById("chat-message");
        if (chatMessage) chatMessage.style.display = "flex";
      }, 2000);
    },

    renderChatWindow() {
      const positionStyles = this.getPositionStyles();
      this.container.innerHTML = `
          <div class="chat-widget" style="${positionStyles} background-color: ${
        this.options.chatWindowColor
      }; color: ${this.options.fontColor}; z-index:9999;">
            <div class="chat-header" style="background-color: ${
              this.options.iconColor
            }; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
              <div style="display: flex; align-items: center;">
                <div id="avatar-container" style="margin-right: 10px;">
                  <img id="avatar" src=${this.options.ChatBotLogoImage ||
        "https://www.w3schools.com/w3images/avatar2.png"
        } alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color: white; font-size: 18px; font-weight: bold;">${this.options.addChatBotName || "ChatBot"
        }</span>
                  <div style="display: flex; align-items: center; gap: 5px; font-size: 12px; color: #fff;">
                    <div style="width:8px; height:8px; border-radius:50%; background-color: rgb(16, 185, 129);"></div>
                    Online
                  </div>
                </div>
              </div>
              <button id="close-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://cdn-icons-png.flaticon.com/128/8213/8213476.png" alt="Close" width="16px" />
              </button>
            </div>
            <div class="chat-messages" id="chat-messages" style="display: flex; flex-direction: column;"></div>
            <div id="suggestion-box-container"></div>

            ${this.options.availability
          ? this.chatInputTemplate()
          : this.contactFormTemplate()
        }
          </div>
        `;
      document.getElementById("close-chat").addEventListener("click", () => {
        // Emit leaveThread before closing the chat
        if (this.threadId) {
          this.socket.emit("leaveThread", this.threadId);
        }
        this.renderIcon();
      });
      if (this.options.availability) {
        this.setupEventListeners();
      } else {
        this.setupContactFormListener();
      }
      this.startChatThread();
    },

    renderContactForm() {
      const chatWidget = document.querySelector(".chat-widget");
      if (!chatWidget) return;
      if (document.getElementById("contact-form-container")) return;
      const formContainer = document.createElement("div");
      formContainer.id = "contact-form-container";
      formContainer.innerHTML = this.contactFormTemplate();
      const chatInputContainer = document.querySelector(
        ".chat-input-container"
      );
      if (chatInputContainer) {
        chatWidget.insertBefore(formContainer, chatInputContainer);
      } else {
        chatWidget.appendChild(formContainer);
      }
      this.setupContactFormListener();
    },

    getMessageTime() {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    fetchIp() {
      return fetch("https://api.ipify.org?format=json")
        .then((response) => response.json())
        .then((data) => data.ip)
        .catch(() => "unknown");
    },

    startChatThread() {
      const currentUrl = window.location.href;
      this.fetchIp().then((ipAddress) => {
        const payload = {
          sender: "User",
          aiOrgId: this.options.orgId,
          aiEnabled: this.options.aiEnabled,
          url: currentUrl,
          ip: ipAddress,
          name: this.userName || "",
          email: this.userEmail || "",
        };
        this.socket.emit("startChat", payload);
        this.socket.once("chatStarted", (data) => {
          this.threadId = data.threadId;
          const greetingMessage =
            this.options.allowCustomGreeting &&
              this.options.customGreetingMessage
              ? this.options.customGreetingMessage
              : "Hello! How can I help you?";

          this.storeBotMessage(greetingMessage);
        });
      });
    },

    sendMessage() {
      const chatInput = document.getElementById("chat-input");
      const message = chatInput.value.trim();
      if (!message) return;
      this.appendMessage("User", message);
      chatInput.value = "";

      if (this.options.allowNameEmail) {
        if (this.collectUserInfoState === "none") {
          this.pendingUserMessage = message;
          this.socket.emit("sendMessage", {
            sender: "User",
            content: message,
            threadId: this.threadId,
            aiOrgId: this.options.orgId,
            aiEnabled: this.options.aiEnabled,
            allowNameEmail: this.options.allowNameEmail,
            createdAt: Date.now(),
          });
          this.collectUserInfoState = "waitingForName";
          this.storeBotMessage("Please enter your name:");
          return;
        } else if (this.collectUserInfoState === "waitingForName") {
          this.userName = message;
          this.socket.emit("sendMessage", {
            sender: "User",
            content: message,
            threadId: this.threadId,
            aiOrgId: this.options.orgId,
            aiEnabled: this.options.aiEnabled,
            allowNameEmail: this.options.allowNameEmail,
            createdAt: Date.now(),
          });
          this.collectUserInfoState = "waitingForEmail";
          this.socket.emit("updateThreadInfo", {
            threadId: this.threadId,
            name: this.userName,
          });
          this.storeBotMessage(
            `Thank you, ${this.userName}. Please enter your email:`
          );
          return;
        } else if (this.collectUserInfoState === "waitingForEmail") {
          this.userEmail = message;
          this.socket.emit("sendMessage", {
            sender: "User",
            content: message,
            threadId: this.threadId,
            aiOrgId: this.options.orgId,
            aiEnabled: this.options.aiEnabled,
            allowNameEmail: this.options.allowNameEmail,
            createdAt: Date.now(),
          });
          this.collectUserInfoState = "done";
          this.socket.emit("updateThreadInfo", {
            threadId: this.threadId,
            email: this.userEmail,
          });
          this.appendTypingIndicator();
          if (this.pendingUserMessage) {
            this.socket.emit("processPendingMessage", {
              sender: "User",
              content: this.pendingUserMessage,
              threadId: this.threadId,
              aiOrgId: this.options.orgId,
              aiEnabled: this.options.aiEnabled,
              allowNameEmail: this.options.allowNameEmail,
              createdAt: Date.now(),
            });
            this.pendingUserMessage = null;
          }
          return;
        }
      }

      this.socket.emit("sendMessage", {
        sender: "User",
        content: message,
        threadId: this.threadId,
        aiOrgId: this.options.orgId,
        aiEnabled: this.options.aiEnabled,
        allowNameEmail: this.options.allowNameEmail,
        createdAt: Date.now(),
      });
      if (this.onlinAgents.length === 0) this.appendTypingIndicator();
      this.socket.emit("updateDashboard", {
        sender: "User",
        content: message,
        threadId: this.threadId,
        createdAt: Date.now(),
      });
    },

    chatInputTemplate() {
      return `
          <div class="chat-input-container">
            <div class="chat-input-wrapper">
              <textarea id="chat-input" style="height: 100%!important;" placeholder="Type a message..."></textarea>
              <div class="chat-actions">
                ${this.options.allowEmojis
          ? '<button id="emoji-picker"><img src="https://cdn-icons-png.flaticon.com/128/4989/4989500.png" alt="Emoji" width="20" height="20" /></button>'
          : ""
        }
                ${this.options.allowFileUpload
          ? '<input type="file" id="file-upload" style="display: none;" /><button id="upload-button"><img src="https://cdn-icons-png.flaticon.com/128/10847/10847957.png" alt="Upload" width="20" height="20"/></button>'
          : ""
        }
                <button id="send-message"><img src="https://cdn-icons-png.flaticon.com/128/9333/9333991.png" alt="Send" width="20" height="20"/></button>
              </div>
            </div>
          </div>
        `;
    },

    appendSuggestion() {
      const suggestionContainerTarget = document.getElementById(
        "suggestion-box-container"
      );

      const suggestionsContainer = document.createElement("div");
      suggestionsContainer.className = "suggestions-container";

      const suggestions = [
        "Ok",
        "Yes",
        "Create Task",
        "Talk Agent",
        "Thank you",
      ];

      suggestions.forEach((text) => {
        const btn = document.createElement("button");
        btn.className = "suggestion";
        btn.textContent = text;
        btn.addEventListener("click", () => {
          this.sendMessageFromSuggestion(text);
        });
        suggestionsContainer.appendChild(btn);
      });

      // Remove existing suggestion blocks before appending new
      const old = suggestionContainerTarget.querySelector(
        ".suggestions-container"
      );
      if (old) old.remove();

      suggestionContainerTarget.appendChild(suggestionsContainer);

      messagesContainer.appendChild(suggestionsContainer);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    removeSuggestions() {
      const suggestionBox = document.getElementById("suggestion-box-container");
      if (suggestionBox) {
        const oldSuggestions = suggestionBox.querySelector(
          ".suggestions-container"
        );
        if (oldSuggestions) oldSuggestions.remove();
      }
    },

    contactFormTemplate() {
      return `
          <div class="contact-form">
            <button id="close-contact-form">&times;</button>
            <h3 class="form-title">Raise a ticket</h3>
            <input type="text" id="contact-name" placeholder="Your Name" required />
            <input type="email" id="contact-email" placeholder="Your Email" required />
            <textarea id="contact-message" placeholder="Your Message" rows="4" required></textarea>
            <button id="submit-contact">Submit</button>
          </div>
        `;
    },

    setupEventListeners() {
      const sendMessageButton = document.getElementById("send-message");
      const chatInput = document.getElementById("chat-input");
      const fileUploadInput = document.getElementById("file-upload");
      const uploadButton = document.getElementById("upload-button");
      const emojiPickerButton = document.getElementById("emoji-picker");

      sendMessageButton.addEventListener("click", () => this.sendMessage());
      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendMessageButton.click();
        }
      });

      this.socket.on("receiveMessage", (data) => {
        console.log("Received message:", data);

        if (document.getElementById("typing-indicator"))
          this.removeTypingIndicator();

        this.appendMessage("ChatBot", data.content);

        if (data.task_creation) {
          this.removeSuggestions();
          this.renderContactForm();
        } else {
          this.appendSuggestion();
        }
      });

      this.socket.on("typing", () => this.appendTypingIndicator());
      this.socket.on("stopTyping", () => this.removeTypingIndicator());
      this.socket.on("agentStatusUpdate", (data) => {
        this.onlinAgents = data;
      });
      this.socket.on("updateDashboard", (data) => {
        if (data.sender === "Bot" && data.threadId === this.threadId) {
          if (document.getElementById("typing-indicator"))
            this.removeTypingIndicator();
          this.appendMessage("ChatBot", data.content);
        }
      });

      if (uploadButton && fileUploadInput) {
        uploadButton.addEventListener("click", () => fileUploadInput.click());
        fileUploadInput.addEventListener("change", (event) => {
          const file = event.target.files[0];
          if (file) this.storeUserMessage(`Uploaded: ${file.name}`);
        });
      }

      if (this.options.allowEmojis)
        this.setupEmojiPicker(chatInput, emojiPickerButton);
    },

    setupEmojiPicker(chatInput, emojiPickerButton) {
      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://cdn.jsdelivr.net/npm/emoji-picker-element@1.26.1/picker.min.js";
      script.onload = () => {
        const picker = document.createElement("emoji-picker");
        picker.classList.add("emoji-picker-container");
        document.body.appendChild(picker);
        picker.style.setProperty("--emoji-size", "1.1rem");
        picker.style.setProperty("--num-columns", "9");
        picker.style.setProperty("--background", "#f5f5f5");
        picker.style.setProperty("--border-color", "none");
        picker.style.setProperty("--button-active-background", "#999");
        picker.style.setProperty("--button-hover-background", "#d9d9d9");

        const shadowRoot = picker.shadowRoot;
        if (shadowRoot) {
          const favoritesSection = shadowRoot.querySelector(".favorites");
          if (favoritesSection) favoritesSection.style.display = "none";
          const tabPanel = shadowRoot.querySelector(".tabpanel");
          if (tabPanel) {
            const style = document.createElement("style");
            style.innerHTML = `
                .tabpanel::-webkit-scrollbar { width: 5px; }
                .tabpanel::-webkit-scrollbar-track { background-color: #f1f1f1; }
                .tabpanel::-webkit-scrollbar-thumb { background-color: #888; border-radius: 10px; }
                .tabpanel::-webkit-scrollbar-thumb:hover { background-color: #555; }
              `;
            shadowRoot.appendChild(style);
          }
        }

        emojiPickerButton.addEventListener("click", (event) => {
          event.stopPropagation();
          picker.style.display =
            picker.style.display === "none" || picker.style.display === ""
              ? "block"
              : "none";
        });
        document.addEventListener("click", (event) => {
          if (
            picker.style.display === "block" &&
            !picker.contains(event.target) &&
            event.target !== emojiPickerButton
          ) {
            picker.style.display = "none";
          }
        });
        picker.addEventListener("emoji-click", (event) => {
          chatInput.value += event.detail.unicode;
        });
      };
      document.body.appendChild(script);
    },

    setupContactFormListener() {
      const submitButton = document.getElementById("submit-contact");
      const closeButton = document.getElementById("close-contact-form");

      if (closeButton) {
        closeButton.addEventListener("click", () => {
          const formContainer = document.getElementById(
            "contact-form-container"
          );
          if (formContainer) formContainer.remove();
        });
      }

      if (submitButton) {
        submitButton.addEventListener("click", () => {
          const name = document.getElementById("contact-name").value.trim();
          const email = document.getElementById("contact-email").value.trim();
          const message = document
            .getElementById("contact-message")
            .value.trim();
          if (name && email && message) {
            this.socket.emit("createTask", {
              aiOrgId: this.options.orgId,
              aiEnabled: this.options.aiEnabled,
              threadId: this.threadId,
              name,
              email,
              query: message,
            });
            const formContainer = document.getElementById(
              "contact-form-container"
            );
            if (formContainer) formContainer.remove();
            const chatInputContainer = document.querySelector(
              ".chat-input-container"
            );
            if (chatInputContainer) {
              const successMessage = document.createElement("div");
              successMessage.id = "task-success-message";
              successMessage.style.textAlign = "center";
              successMessage.style.padding = "5px";
              successMessage.style.backgroundColor = "#d4edda";
              successMessage.style.color = "#155724";
              successMessage.textContent = "Tickets raised successfully";
              chatInputContainer.parentNode.insertBefore(
                successMessage,
                chatInputContainer
              );
              setTimeout(() => {
                if (successMessage) successMessage.remove();
              }, 3000);
            }
          } else {
            alert("Please fill in all fields.");
          }
        });
      }
    },

    appendMessage(sender, message) {
      const messagesContainer = document.getElementById("chat-messages");
      const timeStr = this.getMessageTime();
      const msgElem = document.createElement("div");
      const timeElem = document.createElement("div");
      msgElem.className = `message ${sender === "User" ? "user" : "agent"
        } message-card`;
      const lines = message.split("\n").filter((line) => line.trim() !== "");

      const formattedContent = [];
      let currentListItems = [];
      let tableLines = [];
      let inTable = false;

      lines.forEach((line, index) => {
        const isTableLine =
          line.trim().startsWith("|") && line.trim().endsWith("|");

        if (isTableLine) {
          inTable = true;
          tableLines.push(line);
        } else {
          if (inTable) {
            const rows = tableLines.map((row) =>
              row
                .split("|")
                .map((cell) => cell.trim())
                .filter((cell) => cell !== "")
            );

            const headerRow = rows[0];
            const bodyRows = rows.slice(2); // Skip the separator row (e.g., |---|---|)

            const headerCells = headerRow
              .map((cell) => `<th>${cell}</th>`)
              .join("");
            const header = `<tr>${headerCells}</tr>`;

            const body = bodyRows
              .map((row, rowIndex) => {
                const cells = row
                  .map((cell, cellIndex) => {
                    const linkMatch = cell.match(/\[(.*?)\]\((.*?)\)/);
                    if (linkMatch) {
                      const linkText = linkMatch[1];
                      const linkUrl = linkMatch[2];
                      return `<td class="${cellIndex === 0 ? "row-heading" : ""
                        }"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></td>`;
                    }
                    return `<td class="${cellIndex === 0 ? "row-heading" : ""
                      }">${cell}</td>`;
                  })
                  .join("");
                return `<tr>${cells}</tr>`;
              })
              .join("");

            formattedContent.push(`
              <div class="message-table-wrapper">
                <table class="info-table">${header}${body}</table>
              </div>
            `);

            tableLines = [];
            inTable = false;
          }

          const isNumberedPoint = line.match(/^\d+\.\s*\*\*(.*?)\*\*:\s*(.*)/);
          if (isNumberedPoint) {
            const title = isNumberedPoint[1];
            const description = isNumberedPoint[2];
            currentListItems.push(
              `<li><span class="point-title">${title}:</span> ${description}</li>`
            );
          } else {
            if (currentListItems.length > 0) {
              formattedContent.push(`<ol>${currentListItems.join("")}</ol>`);
              currentListItems = [];
            }
            formattedContent.push(`<p>${line}</p>`);
          }
        }
      });

      if (inTable && tableLines.length > 0) {
        const rows = tableLines.map((row) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell !== "")
        );

        const headerRow = rows[0];
        const bodyRows = rows.slice(2);

        const headerCells = headerRow
          .map((cell) => `<th>${cell}</th>`)
          .join("");
        const header = `<tr>${headerCells}</tr>`;

        const body = bodyRows
          .map((row, rowIndex) => {
            const cells = row
              .map((cell, cellIndex) => {
                const linkMatch = cell.match(/\[(.*?)\]\((.*?)\)/);
                if (linkMatch) {
                  const linkText = linkMatch[1];
                  const linkUrl = linkMatch[2];
                  return `<td class="${cellIndex === 0 ? "row-heading" : ""
                    }"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></td>`;
                }
                return `<td class="${cellIndex === 0 ? "row-heading" : ""
                  }">${cell}</td>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");

        formattedContent.push(`
          <div class="message-table-wrapper">
            <table class="info-table">${header}${body}</table>
          </div>
        `);
      }

      if (currentListItems.length > 0) {
        formattedContent.push(`<ol>${currentListItems.join("")}</ol>`);
      }

      msgElem.innerHTML = `
        <div class="message-content">
          ${formattedContent.join("")}
        </div>
      `;

      Object.assign(timeElem.style, {
        fontSize: "10px",
        color: "#6b7280",
        marginTop: "5px",
        textAlign: sender === "User" ? "right" : "left",
      });
      timeElem.className = "message-time";
      timeElem.textContent = timeStr;
      messagesContainer.append(msgElem, timeElem);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.chatHistory.push({
        sender,
        message,
        time: timeStr,
      });
    },

    appendTypingIndicator() {
      const messagesContainer = document.getElementById("chat-messages");
      if (!messagesContainer || document.getElementById("typing-indicator"))
        return;
      const indicator = document.createElement("div");
      indicator.className = "message agent loading";
      indicator.id = "typing-indicator";
      indicator.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
      messagesContainer.appendChild(indicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    sendMessageFromSuggestion(text) {
      const chatInput = document.getElementById("chat-input");
      chatInput.value = text;
      this.sendMessage();
    },

    removeTypingIndicator() {
      const indicator = document.getElementById("typing-indicator");
      if (indicator) indicator.remove();
    },
  };

  global.ChatWidget = ChatWidget;
})(window);
