(function (global) {
  window.addEventListener('beforeunload', function() {
    localStorage.removeItem('chatWidgetThreadId');
    localStorage.removeItem('chatWidgetHistory');
  });

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
        faqs: data.data?.faqs,
        iconColor: data.data?.iconColor,
        chatWindowColor: data.data?.chatWindowColor,
        fontColor: data.data?.fontColor,
        availability: data.data?.availability,
        socketServer: data.data?.socketServer,
        organizationId: data.data?.orgId
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
      this.threadId = localStorage.getItem('chatWidgetThreadId');
      const savedHistory = localStorage.getItem('chatWidgetHistory');
      this.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
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
        .jooper-chat-widget, .jooper-message, .jooper-suggestion, .jooper-contact-form, .jooper-chat-header, .jooper-chat-input, .jooper-form-title {
          font-family: ${fontFamily} !important;
        }
        .jooper-chat-widget {
          font-family: ${fontFamily} !important;
          position: fixed;
          border: 1px solid #ddd;
          border-radius: 8px;
          width: 100%; 
          height: 100%; 
          max-width: 380px;
          max-height: 550px; 
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          background: ${this.options.chatWindowColor} !important;
          z-index: 9999;
        }
       
        .jooper-chat-header { color: white; border-radius: 8px 8px 0 0; background: ${this.options.iconColor}; display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; }
        .jooper-chat-header .jooper-chat-title { font-size: 20px; font-weight: bold; color: #fff; }
        .jooper-chat-header .jooper-chat-status { font-size: 13px; color: #fff; display: flex; align-items: center; gap: 6px; }
        .jooper-chat-header #avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; margin-right: 12px; }
        .jooper-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: ${this.options.chatWindowColor}; 
          display: flex;
          flex-direction: column;
        }
        .jooper-chat-messages::-webkit-scrollbar { width: 3px; background: #f5f5f5; }
        .jooper-chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .jooper-chat-messages::-webkit-scrollbar-thumb:hover { background: #b0b7c3; }
        .jooper-chat-messages { scrollbar-width: thin; scrollbar-color: #d1d5db #f5f5f5; }
        .jooper-message { padding: 1px 14px; max-width: 80%; margin-top: 8px; display: inline-block; position: relative; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .jooper-message.agent { background: #f5f5f5; color: #222; align-self: flex-start; }
        .jooper-message.user { background: ${this.options.iconColor}; color: #fff; align-self: flex-end; }
        .jooper-chat-input-container { display: flex; padding: 12px; gap: 8px; border-top: 1px solid #eee; background: #fafafa; }
        .jooper-chat-input-wrapper { display: flex; width: 100%; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
        .jooper-chat-input { flex: 1; border: none; border-radius: 6px; padding: 10px; font-size: 15px; background: transparent; resize: none; }
        .jooper-chat-input:focus { outline: none; }
        .jooper-chat-actions { display: flex; align-items: center; gap: 4px; }
        .jooper-chat-actions button { background: none; border: none; cursor: pointer; opacity: 0.7; border-radius: 5px; padding: 5px; }
        .jooper-chat-actions button:hover { opacity: 1; }
        .jooper-suggestions-container {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          align-items: center; /* vertical centering only */
          gap: 8px;
          padding: 10px;
          background: #f5f5f5;
          border-top: 1px solid #eee;
          height: 38px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          margin-top: 0;
        }
        .jooper-suggestions-container::-webkit-scrollbar { display: none; }
        .jooper-suggestion {
          white-space: nowrap;
          background: #fff; /* CHANGED: white background */
          border: 2px solid ${this.options.iconColor}; /* CHANGED: outline color from iconColor */
          color: ${this.options.iconColor}; /* CHANGED: text color from iconColor */
          border-radius: 20px;
          padding: 6px 22px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          margin-bottom: 6px;
        }
        .jooper-suggestion:hover {
          background: ${this.options.iconColor}22; /* CHANGED: more visible fill on hover */
          color: ${this.options.iconColor};
          border-color: ${this.options.iconColor};
        }
        .jooper-message-time { font-size: 11px; color: #888; margin-top: 2px; text-align: right; }
        /* Responsive styles */
        @media (max-width: 600px) {
          .jooper-chat-widget { width: 100vw !important; height: 100vh !important; max-width: 100vw; max-height: 100vh; right: 0 !important; left: 0 !important; bottom: 0 !important; border-radius: 0 !important; }
          .jooper-chat-header { border-radius: 0 !important; }
        }
        .emoji-picker-container { position: absolute; left: 50%; bottom: 70px; transform: translateX(-50%); z-index: 1000; display: none; border: 1px solid #ccc; border-radius: 8px; width: 340px; max-width: 95%; height: 220px; overflow: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.2); background: #fff; }
        .emoji-picker-container::-webkit-scrollbar { width: 6px; background: #f5f5f5; }
        .emoji-picker-container::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .emoji-picker-container::-webkit-scrollbar-thumb:hover { background: #b0b7c3; }
        .emoji-picker-container { scrollbar-width: thin; scrollbar-color: #d1d5db #f5f5f5; }
        .jooper-contact-form {
          padding: 24px 20px 20px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          position: relative;
          margin: 0 8px;
        }
        .jooper-contact-form input, .jooper-contact-form textarea {
          width: 100%;
          margin-bottom: 12px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #fafafa;
          font-size: 15px;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .jooper-contact-form input:focus, .jooper-contact-form textarea:focus {
          border-color:${this.options.iconColor};
          box-shadow: 0 0 5px rgba(102,126,234,0.15);
          outline: none;
        }
        .jooper-contact-form button#submit-contact {
          width: 100%;
          color: #fff;
          background-color: ${this.options.iconColor};
  border: none;
          border-radius: 5px;
          padding: 10px;
          font-size: 16px;
  cursor: pointer;
          opacity: 0.95;
          transition: background 0.3s;
        }
        .jooper-contact-form button#submit-contact:hover {
          opacity: 1;
          background:${this.options.iconColor};
        }
        .jooper-form-title {
          text-align: center;
          font-size: 18px;
          margin: 0 0 20px 0;
          font-weight: bold;
  color :black !important;
          color: #222;
        }
        .jooper-contact-form #close-contact-form {
          position: absolute;
          top: 10px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #888;
          line-height: 1;
          box-shadow: none;
          padding: 0;
          transition: color 0.2s;
        }
        .jooper-contact-form #close-contact-form:hover {
          color: #222;
          background: none;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          height: 18px;
          margin: 4px 0 4px 0;
        }
        .typing-indicator span {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin: 0 2px;
          background: #bbb;
          border-radius: 50%;
          opacity: 0.7;
          animation: typing-bounce 1.2s infinite both;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.7; }
          40% { transform: scale(1.2); opacity: 1; }
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
          faqs: this.options.faqs,
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
          faqs: this.options.faqs,
          allowNameEmail: this.options.allowNameEmail,
          createdAt: Date.now(),
        });
      }
    },

    renderIcon() {
      const positionStyles = this.getPositionStyles();
      const isBottomRight = this.options.position === "bottom-right";
      this.container.innerHTML = `
          <div class="jooper-chat-container ${isBottomRight ? "bottom-right" : "bottom-left"}"
            style="position: fixed; ${positionStyles}; display: flex; align-items: center;">
            <div class="jooper-chat-icon" style="cursor: pointer; background-color: ${this.options.iconColor}; color: white; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
              💬
            </div>
            <div class="jooper-chat-message" id="jooper-chat-message" style="background: white; color: black; padding: 8px 12px; border-radius: 15px; box-shadow: 0px 2px 5px rgba(0,0,0,0.2); ${isBottomRight ? "margin-left: 10px;" : "margin-right: 10px;"} font-size: 14px; display: none; align-items: center;">
              ${this.options.addInitialPopupText || "Hello and welcome to GoldenBot 👋"}
              <button id="jooper-close-message" style="background: none; border: none; font-size: 16px; ${isBottomRight ? "margin-right: 8px;" : "margin-left: 8px;"} cursor: pointer;">&times;</button>
            </div>
          </div>
        `;
      if (isBottomRight) {
        this.container.querySelector(".jooper-chat-container").style.flexDirection =
          "row-reverse";
      }
      this.container
        .querySelector(".jooper-chat-icon")
        .addEventListener("click", () => this.renderChatWindow());
      document.getElementById("jooper-close-message").addEventListener("click", () => {
        document.getElementById("jooper-chat-message").style.display = "none";
      });
      setTimeout(() => {
        const chatMessage = document.getElementById("jooper-chat-message");
        if (chatMessage) chatMessage.style.display = "flex";
      }, 2000);
    },

    renderChatWindow() {
      const positionStyles = this.getPositionStyles();
      this.container.innerHTML = `
          <div class="jooper-chat-widget" style="${positionStyles} background-color: ${this.options.chatWindowColor}; color: ${this.options.fontColor}; z-index:9999;">
            <div class="jooper-chat-header">
              <div style="display: flex; align-items: center;">
                <div id="avatar-container" style="margin-right: 10px;">
                  <img id="avatar" src=${this.options.ChatBotLogoImage || "https://www.w3schools.com/w3images/avatar2.png"} alt="Avatar" />
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span class="jooper-chat-title">${this.options.addChatBotName || "ChatBot"}</span>
                  <div class="jooper-chat-status">
                    <div style="width:8px; height:8px; border-radius:50%; background-color: rgb(16, 185, 129);"></div>
                    Online
                  </div>
                </div>
              </div>
              <button id="jooper-close-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://cdn-icons-png.flaticon.com/128/8213/8213476.png" alt="Close" width="16px" />
              </button>
            </div>
            <div class="jooper-chat-messages" id="jooper-chat-messages"></div>
            <div id="jooper-suggestion-box-container"></div>
            ${this.options.availability ? this.chatInputTemplate() : this.contactFormTemplate()}
          </div>
        `;
      document.getElementById("jooper-close-chat").addEventListener("click", () => {
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
      this.chatHistory.forEach(msg => {
        this.appendMessage(msg.sender, msg.message);
      });
    },

    renderContactForm() {
      const chatWidget = document.querySelector(".jooper-chat-widget");
      if (!chatWidget) return;
      if (document.getElementById("contact-form-container")) return;
      const formContainer = document.createElement("div");
      formContainer.id = "contact-form-container";
      formContainer.innerHTML = this.contactFormTemplate();
      const chatInputContainer = document.querySelector(
        ".jooper-chat-input-container"
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
          faqs: this.options.faqs,
          url: currentUrl,
          ip: ipAddress,
          name: this.userName || "",
          email: this.userEmail || "",
        };
        this.socket.emit("startChat", payload);
        this.socket.once("chatStarted", (data) => {
          this.threadId = data.threadId;
          if (!this.chatHistory || this.chatHistory.length === 0) {
            const greetingMessage =
              this.options.allowCustomGreeting &&
                this.options.customGreetingMessage
                ? this.options.customGreetingMessage
                : "Hello! How can I help you?";

            this.storeBotMessage(greetingMessage);
          }
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
            faqs: this.options.faqs,
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
            faqs: this.options.faqs,
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
            faqs: this.options.faqs,
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
              faqs: this.options.faqs,
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
        faqs: this.options.faqs,
        allowNameEmail: this.options.allowNameEmail,
        orgId:this.options.organizationId,
        createdAt: Date.now(),
      });
      if (this.onlinAgents.length === 0) this.appendTypingIndicator();
      
      this.socket.emit("updateDashboard", {
        sender: "User",
        content: message,
        threadId: this.threadId,
        orgId:this.options.organizationId,
        createdAt: Date.now(),
      });
    },

    chatInputTemplate() {
      return `
          <div class="jooper-chat-input-container">
            <div class="jooper-chat-input-wrapper">
              <textarea class="jooper-chat-input" id="chat-input" style="height: 80%!important;" placeholder="Type a message..."></textarea>
              <div class="jooper-chat-actions">
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
        "jooper-suggestion-box-container"
      );
      

      const suggestionsContainer = document.createElement("div");
      suggestionsContainer.className = "jooper-suggestions-container";

      const suggestions = [
        "Ok",
        "Yes",
        "Create Ticket",
        "Talk to Agent",
        "Thank you",
      ];

      suggestions.forEach((text) => {
        const btn = document.createElement("button");
        btn.className = "jooper-suggestion";
        btn.textContent = text;
        btn.addEventListener("click", () => {
          this.sendMessageFromSuggestion(text);
        });
        suggestionsContainer.appendChild(btn);
      });

      const old = suggestionContainerTarget.querySelector(
        ".jooper-suggestions-container"
      );
      if (old) old.remove();

      suggestionContainerTarget.appendChild(suggestionsContainer);
    },

    removeSuggestions() {
      const suggestionBox = document.getElementById("jooper-suggestion-box-container");
      if (suggestionBox) {
        const oldSuggestions = suggestionBox.querySelector(
          ".jooper-suggestions-container"
        );
        if (oldSuggestions) oldSuggestions.remove();
      }
    },

    contactFormTemplate() {
      return `
          <div class="jooper-contact-form">
            <button id="close-contact-form">&times;</button>
            <h3 class="jooper-form-title">Raise a ticket</h3>
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
        if (data.sender === "Bot" && data.threadId === this.threadId) {

          if (document.getElementById("typing-indicator"))
            this.removeTypingIndicator();

          if (data.content && data.content.trim() !== "") {
            this.appendMessage("ChatBot", data.content);
          }

          if (data.task_creation) {
            this.removeSuggestions();
            this.renderContactForm();
          } else {
            this.appendSuggestion();
          }
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
          if (data.content && data.content.trim() !== "") {
            this.appendMessage("ChatBot", data.content);
          }
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
        const chatWidget = document.querySelector('.jooper-chat-widget');
        if (chatWidget) {
          chatWidget.appendChild(picker);
        } else {
          document.body.appendChild(picker);
        }
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
              faqs: this.options.faqs,
              threadId: this.threadId,
              name,
              email,
              query: message,
              orgId: this.options.organizationId,
            });
            const formContainer = document.getElementById(
              "contact-form-container"
            );
            if (formContainer) formContainer.remove();
            const chatInputContainer = document.querySelector(
              ".jooper-chat-input-container" // CHANGED: use new class for input area
            );
            if (chatInputContainer) {
              const successMessage = document.createElement("div");
              successMessage.id = "task-success-message";
              successMessage.style.textAlign = "center";
              successMessage.style.padding = "5px";
              successMessage.style.backgroundColor = "#d4edda";
              successMessage.style.color = "#155724";
              successMessage.textContent = "Ticket raised successfully";
              chatInputContainer.parentNode.insertBefore(
                successMessage,
                chatInputContainer
              );
              this.appendMessage("Bot", "Ticket has been raised successfully, someone will reach out to you shortly. Is there anything else I can help you with?");

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
      const messagesContainer = document.getElementById("jooper-chat-messages");
      const timeStr = this.getMessageTime();
      const msgElem = document.createElement("div");
      const timeElem = document.createElement("div");
      msgElem.className = `jooper-message ${sender === "User" ? "user" : "agent"}`;
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
      timeElem.className = "jooper-message-time";
      timeElem.textContent = timeStr;
      messagesContainer.append(msgElem, timeElem);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      this.chatHistory.push({ sender, message, time: timeStr });
      localStorage.setItem('chatWidgetThreadId', this.threadId);
      localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
    },

    appendTypingIndicator() {
      const messagesContainer = document.getElementById("jooper-chat-messages");
      if (!messagesContainer || document.getElementById("typing-indicator"))
        return;
      const indicator = document.createElement("div");
      indicator.className = "jooper-message agent loading";
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