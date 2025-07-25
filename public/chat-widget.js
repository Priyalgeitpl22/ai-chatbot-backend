(function (global) {
  // window.addEventListener('beforeunload', function() {
  //   localStorage.removeItem('chatWidgetThreadId');
  //   localStorage.removeItem('chatWidgetHistory');
  // });

  // const BACKEND_URL = "http://localhost:5003";
  const BACKEND_URL = "https://api.chat.jooper.ai";

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }


  const ChatWidget = {
    globalStylesInjected: false,
    userName: "",
    userEmail: "",
    collectUserInfoState: "none",
    pendingUserMessage: null,
    threadId: null,
    chatHistory: [],
    getElement(id) {
      return this.shadowRoot ? this.shadowRoot.getElementById(id) : document.getElementById(id);
    },
    querySelector(sel) {
      return this.shadowRoot ? this.shadowRoot.querySelector(sel) : document.querySelector(sel);
    },

    async init(options) {
      let data = {};
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/chat/config?orgId=${options.orgId}`
        );
        data = await response.json();
      } catch (e) {
        data = { data: {} };
      }

      //chat persist
      this.threadId = getCookie('chatWidgetThreadId');
      if (this.threadId) {
        // Always fetch full history from backend
        fetch(`${BACKEND_URL}/api/message/chat-persist/${this.threadId}`)
          .then(res => res.json())
          .then(data => {
            console.log("data.data", data.data)
            if (data && Array.isArray(data.data) && data.data.length > 0) {
              this.chatHistory = data.data;
              localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
            } else {
              // No history, show greeting
              this.chatHistory = [{
                sender: "ChatBot",
                message: "Hello! How can I help you?",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }];
              localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
            }
          })
          .catch((err) => {
            console.log('Error fetching chat history from API:', err);
            // If API fails, show greeting
            this.chatHistory = [{
              sender: "ChatBot",
              message: "Hello! How can I help you?",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }];
            localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
          });
      }
      // } else {
      //   // No threadId, start a new chat
      //   this.startChatThread();
      // }

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
      if (!this.container.shadowRoot) {
        this.shadowRoot = this.container.attachShadow({ mode: 'open' });
      } else {
        this.shadowRoot = this.container.shadowRoot;
      }

      this.socket = io(this.options.socketServer);
      this.onlinAgents = [];
      this.globalStylesInjected = false;
      this.renderIcon();
      this.injectGlobalStyles();
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
      if (this.shadowRoot) {
        this.shadowRoot.appendChild(style);
      } else {
        document.head.appendChild(style);
      }
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
       
        .jooper-chat-header { color: white; border-radius: 8px 8px 0 0; background: ${this.options.iconColor
        }; display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; }
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
        .jooper-chat-messages::-webkit-scrollbar { width: 6px; background: #f5f5f5; }
        .jooper-chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .jooper-chat-messages::-webkit-scrollbar-thumb:hover { background: #b0b7c3; }
        .jooper-chat-messages { scrollbar-width: thin; scrollbar-color: #d1d5db #f5f5f5; }
        .jooper-message { padding: 1px 14px; max-width: 80%; margin-top: 8px; display: inline-block; position: relative; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .jooper-message.agent { background: #f5f5f5; color: #222; align-self: flex-start; }
        .jooper-message.user { background: ${this.options.iconColor
        }; color: #fff; align-self: flex-end; }
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
          scrollbar-width: none;
          -ms-overflow-style: none;
          margin-top: 0;
        }
        .jooper-suggestions-container::-webkit-scrollbar { display: none; }
        .jooper-suggestion {
          white-space: nowrap;
          background: #fff; /* CHANGED: white background */
          border: 2px solid ${this.options.iconColor
        }; /* CHANGED: outline color from iconColor */
          color: ${this.options.iconColor
        }; /* CHANGED: text color from iconColor */
          border-radius: 20px;
          padding: 6px 22px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          margin-bottom: 6px;
        }
        .jooper-suggestion:hover {
          background: ${this.options.iconColor
        }22; /* CHANGED: more visible fill on hover */
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
          padding: 15px 20px 10px 20px;
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
          margin-block: 6px;
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
          margin-top: 4px;
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
          color: black !important;
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
          .jooper-end-chat-popup {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }
        .jooper-popup-content {
          background: ${this.options.chatWindowColor || "#fff"};
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          max-width: 300px;
          text-align: center;
        }
        .jooper-popup-message {
          font-size: 16px;
          color: ${this.options.fontColor || "#000"};
          margin-bottom: 20px;
        }
        .jooper-popup-actions {
          display: flex;
          justify-content: space-around;
        }
        .jooper-popup-button {
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        #end-chat-confirm {
          background: ${this.options.iconColor || "#007bff"};
          color: #fff;
        }
        #end-chat-confirm:hover {
          opacity: 0.9;
        }
        #end-chat-cancel {
          background: #ccc;
          color: #000;
        }
        #end-chat-cancel:hover {
          background: #bbb;
        }
        .jooper-wa-image-bubble {
          position: relative;
          display: inline-block;
          margin-block: 8px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .jooper-wa-image-preview {
          width: 100%;
          height: auto;
          display: block;
        }
        .jooper-wa-image-download-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(0,0,0,0.5);
          border-radius: 12px;
          opacity: 0;
          transition: opacity 0.3s ease;
          cursor: pointer;
          z-index: 1;
        }
        .jooper-wa-image-bubble:hover .jooper-wa-image-download-overlay {
          opacity: 1;
        }
        .jooper-wa-doc-bubble {
          position: relative;
          display: inline-flex;
          align-items: center;
          max-width: 80%;
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #e0e0e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .jooper-wa-doc-icon {
          margin-right: 8px;
          display: flex;
          align-items: center;
        }
        .jooper-wa-doc-name {
          flex-grow: 1;
          font-size: 14px;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .jooper-wa-doc-download {
          display: flex;
          align-items: center;
          margin-left: 8px;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }
        .jooper-wa-doc-bubble:hover .jooper-wa-doc-download {
          opacity: 1;
        }
        .jooper-wa-doc-bubble {
          display: flex;
          align-items: center;
          border-radius: 12px;
          padding: 10px 16px;
          margin: 8px 0;
          max-width: 320px;
          min-width: 180px;
          align-self: flex-end;
          margin-left: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          word-break: break-word;
        }
        .jooper-wa-doc-icon {
          margin-right: 10px;
          flex-shrink: 0;
        }
        .jooper-wa-doc-name {
          font-weight: 500;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .jooper-wa-doc-download {
          margin-left: 10px;
          display: flex;
          align-items: center;
          color: #fff;
          opacity: 0.85;
          transition: opacity 0.2s;
          border: 2px solid ${this.options.iconColor};
          border-radius:50%;
          padding: 5px;
          background:#fff;
          outline:1px solid #fff;
        }
        .jooper-wa-doc-download:hover {
          opacity: 1;
        }
        .jooper-wa-image-bubble {
          position: relative;
          display: inline-block;
          border-radius: 12px;
          overflow: hidden;
          margin: 8px 0;
          max-width: 220px;
          align-self: flex-end;
          margin-left: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .jooper-wa-image-preview {
          display: block;
          width: 100%;
          height: auto;
          max-width: 220px;
          max-height: 220px;
          border-radius: 12px;
        }
        .jooper-wa-image-download-overlay {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 2;
        }
        .jooper-wa-image-bubble:hover .jooper-wa-image-download-overlay {
          opacity: 1;
        }
        @media (max-width: 600px) {
          .jooper-chat-widget { width: 100vw !important; height: 100vh !important; max-width: 100vw; max-height: 100vh; right: 0 !important; left: 0 !important; bottom: 0 !important; border-radius: 0 !important; }
          .jooper-chat-header { border-radius: 0 !important; }
          .jooper-wa-doc-bubble {
            max-width: 90vw;
            min-width: 0;
            font-size: 15px;
            padding: 8px 10px;
          }
          .jooper-wa-doc-name {
            font-size: 15px;
            max-width: 50vw;
          }
          .jooper-wa-image-bubble {
            max-width: 90vw;
          }
          .jooper-wa-image-preview {
            max-width: 90vw;
            max-height: 40vh;
          }
        }
        @media (max-width: 400px) {
          .jooper-wa-doc-bubble {
            font-size: 13px;
            padding: 6px 6px;
          }
          .jooper-wa-doc-name {
            font-size: 13px;
            max-width: 35vw;
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
          file: !!content.file_url,
          content: content.file_name,
          threadId: this.threadId,
          aiOrgId: this.options.orgId,
          aiEnabled: this.options.aiEnabled,
          faqs: this.options.faqs,
          allowNameEmail: this.options.allowNameEmail,
          createdAt: Date.now(),
          orgId: this.options.organizationId,
          fileData: content
        });
        this.socket.emit("updateDashboard", {
          sender: "User",
          file: !!content.file_url,
          content: content.file_name,
          threadId: this.threadId,
          orgId: this.options.organizationId,
          createdAt: Date.now(),
          orgId: this.options.organizationId,
          fileData: content
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
          orgId: this.options.organizationId
        });

      }
    },

    renderIcon() {
      //to do
      const positionStyles = this.getPositionStyles();
      const isBottomRight = this.options.position === "bottom-right";
      if (this.shadowRoot) {
        this.globalStylesInjected = false;
        this.shadowRoot.innerHTML = `
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
        this.injectGlobalStyles();

        if (isBottomRight) {
          this.shadowRoot.querySelector(".jooper-chat-container").style.flexDirection =
            "row-reverse";
        }
        this.shadowRoot
          .querySelector(".jooper-chat-icon")
          .addEventListener("click", () => {
            this.renderChatWindow()
          });
        this.shadowRoot.getElementById("jooper-close-message").addEventListener("click", () => {
          this.shadowRoot.getElementById("jooper-chat-message").style.display = "none";
        });
        setTimeout(() => {
          const chatMessage = this.shadowRoot.getElementById("jooper-chat-message");
          if (chatMessage) chatMessage.style.display = "flex";
        }, 2000);
      } else {
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
      }
    },

    renderChatWindow() {
      const positionStyles = this.getPositionStyles();
      if (this.shadowRoot) {
        this.globalStylesInjected = false;
        this.shadowRoot.innerHTML = `
          <div class="jooper-chat-widget" style="${positionStyles} background-color: ${this.options.chatWindowColor
          }; color: ${this.options.fontColor}; z-index:9999;">
            <div class="jooper-chat-header">
              <div style="display: flex; align-items: center;">
                <div id="avatar-container" style="margin-right: 10px;">
                  <img id="avatar" src=${this.options.ChatBotLogoImage ||
          "https://www.w3schools.com/w3images/avatar2.png"
          } alt="Avatar" />
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span class="jooper-chat-title">${this.options.addChatBotName || "ChatBot"
          }</span>
                  <div class="jooper-chat-status">
                    <div style="width:8px; height:8px; border-radius:50%; background-color: rgb(16, 185, 129);"></div>
                    Online
                  </div>
                </div>
              </div>
              <div>
               <button id="jooper-end-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer ">
                <h3 style="border:2px solid white; padding:5px; border-radius:5px;  text-shadow:1px -1px 3px black">End Chat</h3>
              </button>
               <button id="jooper-close-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://cdn-icons-png.flaticon.com/128/8213/8213476.png" alt="Close" width="16px" />
              </button>
             
              </div>
            </div>
            <div class="jooper-chat-messages" id="jooper-chat-messages"></div>
            <div id="end-chat-popup" class="jooper-end-chat-popup" style="display: none;">
            <div class="jooper-popup-content">
            <p class="jooper-popup-message">Are you sure you want to end the chat? This will clear your chat history.</p>
            <div class="jooper-popup-actions">
            <button id="end-chat-confirm" class="jooper-popup-button">Confirm</button>
            <button id="end-chat-cancel" class="jooper-popup-button">Cancel</button>
             </div>
             </div>
            </div>
            <div id="jooper-suggestion-box-container"></div>
            ${this.options.availability
            ? this.chatInputTemplate()
            : this.contactFormTemplate()
          }
          </div>
        `;
        this.injectGlobalStyles();
        this.shadowRoot.getElementById("jooper-close-chat").addEventListener("click", () => {
          if (this.threadId) {
            this.socket.emit("leaveThread", this.threadId);
          }
          this.renderIcon();
        });
        this.getElement("jooper-end-chat").addEventListener("click", () => {
          const popup = this.getElement("end-chat-popup");
          if (popup) {
            popup.style.display = "flex";
          }
        });

        this.getElement("end-chat-confirm").addEventListener("click", () => {
          if (this.threadId) {
            fetch(`${BACKEND_URL}/api/chat/config/end`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                thread_id: this.threadId,
                ended_by: "user"
              })
            })
              .then(response => response.json())
              .then(data => {
                console.log(data)
                if (data.code === 200) {
                  this.socket.emit("leaveThread", this.threadId)
                  localStorage.removeItem('chatWidgetThreadId');
                  localStorage.removeItem('chatWidgetHistory');
                  document.cookie = "chatWidgetThreadId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  this.chatHistory = [];
                  this.threadId = null;
                  this.renderIcon();

                } else {
                  const popup = this.getElement("end-chat-popup");
                  if (popup) {
                    popup.style.display = "none";
                  }
                }
              })
              .catch(error => {
                const popup = this.getElement("end-chat-popup");
                if (popup) {
                  popup.style.display = "none";
                }
              });

          }
        });

        this.getElement("end-chat-cancel").addEventListener("click", () => {
          const popup = this.getElement("end-chat-popup");
          if (popup) {
            popup.style.display = "none";
          }
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
        this.threadId = data.threadId
        if (!this.chatHistory || this.chatHistory.length === 0) {
          const greetingMessage =
            this.options.allowCustomGreeting && this.options.customGreetingMessage
              ? this.options.customGreetingMessage
              : "Hello! How can I help you?";
          this.appendMessage("ChatBot", greetingMessage);
          this.appendSuggestion();
        }
      } else {
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
              <div>
               <button id="jooper-end-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://cdn-icons-png.flaticon.com/128/8213/8213476.png" alt="Close" width="16px" />
              </button>
              <button id="jooper-close-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://img.icons8.com/?size=400&id=VaHFapP3XCAj&format=png&color=FFFFFF" alt="Close" width="16px" />
              </button>
              </div>
            </div>
            <div class="jooper-chat-messages" id="jooper-chat-messages"></div>
            <div id="jooper-suggestion-box-container"></div>
            ${this.options.availability ? this.chatInputTemplate() : this.contactFormTemplate()}
          </div>
        `;
        if (this.options.availability) {
          this.setupEventListeners();
        } else {
          this.setupContactFormListener();
        }
        this.startChatThread();
        this.chatHistory.forEach(msg => {
          this.appendMessage(msg.sender, msg.message);
        });
        this.threadId = data.threadId;
        if (!this.chatHistory || this.chatHistory.length === 0) {
          const greetingMessage =
            this.options.allowCustomGreeting && this.options.customGreetingMessage
              ? this.options.customGreetingMessage
              : "Hello! How can I help you?";
          this.appendMessage("ChatBot", greetingMessage);
          this.appendSuggestion();
        }

      }
    },

    renderContactForm() {
      this.removeSuggestions();
      const chatWidget = this.querySelector(".jooper-chat-widget");
      if (!chatWidget) return;
      if (this.getElement("contact-form-container")) return;
      const formContainer = document.createElement("div");
      formContainer.id = "contact-form-container";
      formContainer.innerHTML = this.contactFormTemplate();
      const chatInputContainer = this.querySelector(
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

      const existingThreadId = getCookie("chatWidgetThreadId");
      if (existingThreadId) {
        this.threadId = existingThreadId;
        return;
      }
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
          orgId: this.options.organizationId,
        };
        this.socket.emit("startChat", payload);
        this.socket.once("chatStarted", (data) => {
          this.threadId = data?.threadId;
          if (!this.chatHistory || this.chatHistory.length === 0) {
            const greetingMessage =
              this.options.allowCustomGreeting && this.options.customGreetingMessage
                ? this.options.customGreetingMessage
                : "Hello! How can I help you?";
            this.storeBotMessage(greetingMessage);
            this.appendSuggestion();
          }
document.cookie = `chatWidgetThreadId=${this.threadId}; path=/`;
        });
      });
    },

    sendMessage() {
      const chatInput = this.getElement("chat-input");
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
            orgId: this.options.organizationId
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
            orgId: this.options.organizationId
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
            orgId: this.options.organizationId
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
        orgId: this.options.organizationId,
        createdAt: Date.now(),
        orgId: this.options.organizationId
      });
      if (this.onlinAgents.length === 0) this.appendTypingIndicator();

      this.socket.emit("updateDashboard", {
        sender: "User",
        content: message,
        threadId: this.threadId,
        orgId: this.options.organizationId,
        createdAt: Date.now(),
      });
    },

    chatInputTemplate() {
      return `
          <div class="jooper-chat-input-container">
            <div class="jooper-chat-input-wrapper">
              <textarea class="jooper-chat-input" id="chat-input" style="min-height: 28px; max-height: 48px; overflow-y: auto; resize: none; scrollbar-width: none; padding: 10px;" placeholder="Type a message..."></textarea>
              <style>
                .jooper-chat-input::-webkit-scrollbar { display: none; }
                .jooper-chat-input { scrollbar-width: none; -ms-overflow-style: none; }
              </style>
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
      const suggestionContainerTarget = this.querySelector(
        "#jooper-suggestion-box-container"
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
      const suggestionBox = this.querySelector("#jooper-suggestion-box-container");
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
            <span id="contact-name-error" class="jooper-error-message" style="color: red; font-size: 12px; align-self: self-start; display: none;"></span>
            <input type="email" id="contact-email" placeholder="Your Email" required />
            <span id="contact-email-error" class="jooper-error-message" style="color: red; font-size: 12px; align-self: self-start; display: none;"></span>
            <textarea id="contact-message" placeholder="Your Message" rows="4" required></textarea>
            <span id="contact-message-error" class="jooper-error-message" style="color: red; font-size: 12px; align-self: self-start; display: none;"></span>
            <button id="submit-contact">Submit</button>
          </div>
        `;
    },

    setupEventListeners() {
        // pre existing clean up of the socket 
     this.socket.off("receiveMessage");
     this.socket.off("typing");
     this.socket.off("stopTyping");
     this.socket.off("agentStatusUpdate");
     this.socket.off("updateDashboard");

      const sendMessageButton = this.getElement("send-message");
      const chatInput = this.getElement("chat-input");
      const fileUploadInput = this.getElement("file-upload");
      const uploadButton = this.getElement("upload-button");
      const emojiPickerButton = this.getElement("emoji-picker");

      sendMessageButton.addEventListener("click", () => this.sendMessage());
      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {(function (global) {
  // window.addEventListener('beforeunload', function() {
  //   localStorage.removeItem('chatWidgetThreadId');
  //   localStorage.removeItem('chatWidgetHistory');
  // });

  const BACKEND_URL = "http://localhost:5003";
  // const BACKEND_URL = "https://api.chat.jooper.ai";

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }


  const ChatWidget = {
    globalStylesInjected: false,
    userName: "",
    userEmail: "",
    collectUserInfoState: "none",
    pendingUserMessage: null,
    threadId: null,
    chatHistory: [],
    getElement(id) {
      return this.shadowRoot ? this.shadowRoot.getElementById(id) : document.getElementById(id);
    },
    querySelector(sel) {
      return this.shadowRoot ? this.shadowRoot.querySelector(sel) : document.querySelector(sel);
    },

    async init(options) {
      let data = {};
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/chat/config?orgId=${options.orgId}`
        );
        data = await response.json();
      } catch (e) {
        data = { data: {} };
      }

      //chat persist
      this.threadId = getCookie('chatWidgetThreadId');
      if (this.threadId) {
        // Always fetch full history from backend
        fetch(`${BACKEND_URL}/api/message/chat-persist/${this.threadId}`)
          .then(res => res.json())
          .then(data => {
            console.log("data.data", data.data)
            if (data && Array.isArray(data.data) && data.data.length > 0) {
              this.chatHistory = data.data;
              localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
            } else {
              // No history, show greeting
              this.chatHistory = [{
                sender: "ChatBot",
                message: "Hello! How can I help you?",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }];
              localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
            }
          })
          .catch((err) => {
            console.log('Error fetching chat history from API:', err);
            // If API fails, show greeting
            this.chatHistory = [{
              sender: "ChatBot",
              message: "Hello! How can I help you?",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }];
            localStorage.setItem('chatWidgetHistory', JSON.stringify(this.chatHistory));
          });
      } else {
        // No threadId, start a new chat
        this.startChatThread();
      }

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
      if (!this.container.shadowRoot) {
        this.shadowRoot = this.container.attachShadow({ mode: 'open' });
      } else {
        this.shadowRoot = this.container.shadowRoot;
      }

      this.socket = io(this.options.socketServer);
      this.onlinAgents = [];
      this.globalStylesInjected = false;
      this.renderIcon();
      this.injectGlobalStyles();
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
      if (this.shadowRoot) {
        this.shadowRoot.appendChild(style);
      } else {
        document.head.appendChild(style);
      }
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
       
        .jooper-chat-header { color: white; border-radius: 8px 8px 0 0; background: ${this.options.iconColor
        }; display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; }
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
        .jooper-chat-messages::-webkit-scrollbar { width: 6px; background: #f5f5f5; }
        .jooper-chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .jooper-chat-messages::-webkit-scrollbar-thumb:hover { background: #b0b7c3; }
        .jooper-chat-messages { scrollbar-width: thin; scrollbar-color: #d1d5db #f5f5f5; }
        .jooper-message { padding: 1px 14px; max-width: 80%; margin-top: 8px; display: inline-block; position: relative; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .jooper-message.agent { background: #f5f5f5; color: #222; align-self: flex-start; }
        .jooper-message.user { background: ${this.options.iconColor
        }; color: #fff; align-self: flex-end; }
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
          scrollbar-width: none;
          -ms-overflow-style: none;
          margin-top: 0;
        }
        .jooper-suggestions-container::-webkit-scrollbar { display: none; }
        .jooper-suggestion {
          white-space: nowrap;
          background: #fff; /* CHANGED: white background */
          border: 2px solid ${this.options.iconColor
        }; /* CHANGED: outline color from iconColor */
          color: ${this.options.iconColor
        }; /* CHANGED: text color from iconColor */
          border-radius: 20px;
          padding: 6px 22px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          margin-bottom: 6px;
        }
        .jooper-suggestion:hover {
          background: ${this.options.iconColor
        }22; /* CHANGED: more visible fill on hover */
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
          padding: 15px 20px 10px 20px;
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
          margin-block: 6px;
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
          margin-top: 4px;
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
          color: black !important;
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
          .jooper-end-chat-popup {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }
        .jooper-popup-content {
          background: ${this.options.chatWindowColor || "#fff"};
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          max-width: 300px;
          text-align: center;
        }
        .jooper-popup-message {
          font-size: 16px;
          color: ${this.options.fontColor || "#000"};
          margin-bottom: 20px;
        }
        .jooper-popup-actions {
          display: flex;
          justify-content: space-around;
        }
        .jooper-popup-button {
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        #end-chat-confirm {
          background: ${this.options.iconColor || "#007bff"};
          color: #fff;
        }
        #end-chat-confirm:hover {
          opacity: 0.9;
        }
        #end-chat-cancel {
          background: #ccc;
          color: #000;
        }
        #end-chat-cancel:hover {
          background: #bbb;
        }
        .jooper-wa-image-bubble {
          position: relative;
          display: inline-block;
          margin-block: 8px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .jooper-wa-image-preview {
          width: 100%;
          height: auto;
          display: block;
        }
        .jooper-wa-image-download-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(0,0,0,0.5);
          border-radius: 12px;
          opacity: 0;
          transition: opacity 0.3s ease;
          cursor: pointer;
          z-index: 1;
        }
        .jooper-wa-image-bubble:hover .jooper-wa-image-download-overlay {
          opacity: 1;
        }
        .jooper-wa-doc-bubble {
          position: relative;
          display: inline-flex;
          align-items: center;
          max-width: 80%;
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #e0e0e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .jooper-wa-doc-icon {
          margin-right: 8px;
          display: flex;
          align-items: center;
        }
        .jooper-wa-doc-name {
          flex-grow: 1;
          font-size: 14px;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .jooper-wa-doc-download {
          display: flex;
          align-items: center;
          margin-left: 8px;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }
        .jooper-wa-doc-bubble:hover .jooper-wa-doc-download {
          opacity: 1;
        }
        .jooper-wa-doc-bubble {
          display: flex;
          align-items: center;
          border-radius: 12px;
          padding: 10px 16px;
          margin: 8px 0;
          max-width: 320px;
          min-width: 180px;
          align-self: flex-end;
          margin-left: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          word-break: break-word;
        }
        .jooper-wa-doc-icon {
          margin-right: 10px;
          flex-shrink: 0;
        }
        .jooper-wa-doc-name {
          font-weight: 500;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .jooper-wa-doc-download {
          margin-left: 10px;
          display: flex;
          align-items: center;
          color: #fff;
          opacity: 0.85;
          transition: opacity 0.2s;
          border: 2px solid ${this.options.iconColor};
          border-radius:50%;
          padding: 5px;
          background:#fff;
          outline:1px solid #fff;
        }
        .jooper-wa-doc-download:hover {
          opacity: 1;
        }
        .jooper-wa-image-bubble {
          position: relative;
          display: inline-block;
          border-radius: 12px;
          overflow: hidden;
          margin: 8px 0;
          max-width: 220px;
          align-self: flex-end;
          margin-left: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .jooper-wa-image-preview {
          display: block;
          width: 100%;
          height: auto;
          max-width: 220px;
          max-height: 220px;
          border-radius: 12px;
        }
        .jooper-wa-image-download-overlay {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 2;
        }
        .jooper-wa-image-bubble:hover .jooper-wa-image-download-overlay {
          opacity: 1;
        }
        @media (max-width: 600px) {
          .jooper-chat-widget { width: 100vw !important; height: 100vh !important; max-width: 100vw; max-height: 100vh; right: 0 !important; left: 0 !important; bottom: 0 !important; border-radius: 0 !important; }
          .jooper-chat-header { border-radius: 0 !important; }
          .jooper-wa-doc-bubble {
            max-width: 90vw;
            min-width: 0;
            font-size: 15px;
            padding: 8px 10px;
          }
          .jooper-wa-doc-name {
            font-size: 15px;
            max-width: 50vw;
          }
          .jooper-wa-image-bubble {
            max-width: 90vw;
          }
          .jooper-wa-image-preview {
            max-width: 90vw;
            max-height: 40vh;
          }
        }
        @media (max-width: 400px) {
          .jooper-wa-doc-bubble {
            font-size: 13px;
            padding: 6px 6px;
          }
          .jooper-wa-doc-name {
            font-size: 13px;
            max-width: 35vw;
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
          file: !!content.file_url,
          content: content.file_name,
          threadId: this.threadId,
          aiOrgId: this.options.orgId,
          aiEnabled: this.options.aiEnabled,
          faqs: this.options.faqs,
          allowNameEmail: this.options.allowNameEmail,
          createdAt: Date.now(),
          orgId: this.options.organizationId,
          fileData: content
        });
        this.socket.emit("updateDashboard", {
          sender: "User",
          file: !!content.file_url,
          content: content.file_name,
          threadId: this.threadId,
          orgId: this.options.organizationId,
          createdAt: Date.now(),
          orgId: this.options.organizationId,
          fileData: content
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
          orgId: this.options.organizationId
        });

      }
    },

    renderIcon() {
      //to do
      const positionStyles = this.getPositionStyles();
      const isBottomRight = this.options.position === "bottom-right";
      if (this.shadowRoot) {
        this.globalStylesInjected = false;
        this.shadowRoot.innerHTML = `
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
        this.injectGlobalStyles();

        if (isBottomRight) {
          this.shadowRoot.querySelector(".jooper-chat-container").style.flexDirection =
            "row-reverse";
        }
        this.shadowRoot
          .querySelector(".jooper-chat-icon")
          .addEventListener("click", () => {
            this.renderChatWindow()
          });
        this.shadowRoot.getElementById("jooper-close-message").addEventListener("click", () => {
          this.shadowRoot.getElementById("jooper-chat-message").style.display = "none";
        });
        setTimeout(() => {
          const chatMessage = this.shadowRoot.getElementById("jooper-chat-message");
          if (chatMessage) chatMessage.style.display = "flex";
        }, 2000);
      } else {
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
      }
    },

    renderChatWindow() {
      const positionStyles = this.getPositionStyles();
      if (this.shadowRoot) {
        this.globalStylesInjected = false;
        this.shadowRoot.innerHTML = `
          <div class="jooper-chat-widget" style="${positionStyles} background-color: ${this.options.chatWindowColor
          }; color: ${this.options.fontColor}; z-index:9999;">
            <div class="jooper-chat-header">
              <div style="display: flex; align-items: center;">
                <div id="avatar-container" style="margin-right: 10px;">
                  <img id="avatar" src=${this.options.ChatBotLogoImage ||
          "https://www.w3schools.com/w3images/avatar2.png"
          } alt="Avatar" />
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span class="jooper-chat-title">${this.options.addChatBotName || "ChatBot"
          }</span>
                  <div class="jooper-chat-status">
                    <div style="width:8px; height:8px; border-radius:50%; background-color: rgb(16, 185, 129);"></div>
                    Online
                  </div>
                </div>
              </div>
              <div>
               <button id="jooper-end-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer ">
                <h3 style="border:2px solid white; padding:5px; border-radius:5px;  text-shadow:1px -1px 3px black">End Chat</h3>
              </button>
               <button id="jooper-close-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://cdn-icons-png.flaticon.com/128/8213/8213476.png" alt="Close" width="16px" />
              </button>
             
              </div>
            </div>
            <div class="jooper-chat-messages" id="jooper-chat-messages"></div>
            <div id="end-chat-popup" class="jooper-end-chat-popup" style="display: none;">
            <div class="jooper-popup-content">
            <p class="jooper-popup-message">Are you sure you want to end the chat? This will clear your chat history.</p>
            <div class="jooper-popup-actions">
            <button id="end-chat-confirm" class="jooper-popup-button">Confirm</button>
            <button id="end-chat-cancel" class="jooper-popup-button">Cancel</button>
             </div>
             </div>
            </div>
            <div id="jooper-suggestion-box-container"></div>
            ${this.options.availability
            ? this.chatInputTemplate()
            : this.contactFormTemplate()
          }
          </div>
        `;
        this.injectGlobalStyles();
        this.shadowRoot.getElementById("jooper-close-chat").addEventListener("click", () => {
          if (this.threadId) {
            this.socket.emit("leaveThread", this.threadId);
          }
          this.renderIcon();
        });
        this.getElement("jooper-end-chat").addEventListener("click", () => {
          const popup = this.getElement("end-chat-popup");
          if (popup) {
            popup.style.display = "flex";
          }
        });

        this.getElement("end-chat-confirm").addEventListener("click", () => {
          if (this.threadId) {
            fetch(`${BACKEND_URL}/api/chat/config/end`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                thread_id: this.threadId,
                ended_by: "user"
              })
            })
              .then(response => response.json())
              .then(data => {
                console.log(data)
                if (data.code === 200) {
                  this.socket.emit("leaveThread", this.threadId)
                  localStorage.removeItem('chatWidgetThreadId');
                  localStorage.removeItem('chatWidgetHistory');
                  document.cookie = "chatWidgetThreadId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  this.chatHistory = [];
                  this.threadId = null;
                  this.renderIcon();

                } else {
                  const popup = this.getElement("end-chat-popup");
                  if (popup) {
                    popup.style.display = "none";
                  }
                }
              })
              .catch(error => {
                const popup = this.getElement("end-chat-popup");
                if (popup) {
                  popup.style.display = "none";
                }
              });

          }
        });

        this.getElement("end-chat-cancel").addEventListener("click", () => {
          const popup = this.getElement("end-chat-popup");
          if (popup) {
            popup.style.display = "none";
          }
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
        this.threadId = data.threadId
        if (!this.chatHistory || this.chatHistory.length === 0) {
          const greetingMessage =
            this.options.allowCustomGreeting && this.options.customGreetingMessage
              ? this.options.customGreetingMessage
              : "Hello! How can I help you?";
          this.appendMessage("ChatBot", greetingMessage);
          this.appendSuggestion();
        }
      } else {
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
              <div>
               <button id="jooper-end-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://cdn-icons-png.flaticon.com/128/8213/8213476.png" alt="Close" width="16px" />
              </button>
              <button id="jooper-close-chat" style="background: none; color: white; border: none; font-size: 14px; cursor: pointer;">
                <img src="https://img.icons8.com/?size=400&id=VaHFapP3XCAj&format=png&color=FFFFFF" alt="Close" width="16px" />
              </button>
              </div>
            </div>
            <div class="jooper-chat-messages" id="jooper-chat-messages"></div>
            <div id="jooper-suggestion-box-container"></div>
            ${this.options.availability ? this.chatInputTemplate() : this.contactFormTemplate()}
          </div>
        `;
        if (this.options.availability) {
          this.setupEventListeners();
        } else {
          this.setupContactFormListener();
        }
        this.startChatThread();
        this.chatHistory.forEach(msg => {
          this.appendMessage(msg.sender, msg.message);
        });
        this.threadId = data.threadId;
        if (!this.chatHistory || this.chatHistory.length === 0) {
          const greetingMessage =
            this.options.allowCustomGreeting && this.options.customGreetingMessage
              ? this.options.customGreetingMessage
              : "Hello! How can I help you?";
          this.appendMessage("ChatBot", greetingMessage);
          this.appendSuggestion();
        }

      }
    },

    renderContactForm() {
      this.removeSuggestions();
      const chatWidget = this.querySelector(".jooper-chat-widget");
      if (!chatWidget) return;
      if (this.getElement("contact-form-container")) return;
      const formContainer = document.createElement("div");
      formContainer.id = "contact-form-container";
      formContainer.innerHTML = this.contactFormTemplate();
      const chatInputContainer = this.querySelector(
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

      const existingThreadId = getCookie("chatWidgetThreadId");
      if (existingThreadId) {
        this.threadId = existingThreadId;
        return;
      }
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
          orgId: this.options.organizationId,
        };
        this.socket.emit("startChat", payload);
        this.socket.once("chatStarted", (data) => {
          this.threadId = data?.threadId;
          if (!this.chatHistory || this.chatHistory.length === 0) {
            const greetingMessage =
              this.options.allowCustomGreeting && this.options.customGreetingMessage
                ? this.options.customGreetingMessage
                : "Hello! How can I help you?";
            this.storeBotMessage(greetingMessage);
            this.appendSuggestion();
          }
document.cookie = `chatWidgetThreadId=${this.threadId}; path=/`;
        });
      });
    },

    sendMessage() {
      const chatInput = this.getElement("chat-input");
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
            orgId: this.options.organizationId
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
            orgId: this.options.organizationId
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
            orgId: this.options.organizationId
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
        orgId: this.options.organizationId,
        createdAt: Date.now(),
        orgId: this.options.organizationId
      });
      if (this.onlinAgents.length === 0) this.appendTypingIndicator();

      this.socket.emit("updateDashboard", {
        sender: "User",
        content: message,
        threadId: this.threadId,
        orgId: this.options.organizationId,
        createdAt: Date.now(),
      });
    },

    chatInputTemplate() {
      return `
          <div class="jooper-chat-input-container">
            <div class="jooper-chat-input-wrapper">
              <textarea class="jooper-chat-input" id="chat-input" style="min-height: 28px; max-height: 48px; overflow-y: auto; resize: none; scrollbar-width: none; padding: 10px;" placeholder="Type a message..."></textarea>
              <style>
                .jooper-chat-input::-webkit-scrollbar { display: none; }
                .jooper-chat-input { scrollbar-width: none; -ms-overflow-style: none; }
              </style>
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
      const suggestionContainerTarget = this.querySelector(
        "#jooper-suggestion-box-container"
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
      const suggestionBox = this.querySelector("#jooper-suggestion-box-container");
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
            <span id="contact-name-error" class="jooper-error-message" style="color: red; font-size: 12px; align-self: self-start; display: none;"></span>
            <input type="email" id="contact-email" placeholder="Your Email" required />
            <span id="contact-email-error" class="jooper-error-message" style="color: red; font-size: 12px; align-self: self-start; display: none;"></span>
            <textarea id="contact-message" placeholder="Your Message" rows="4" required></textarea>
            <span id="contact-message-error" class="jooper-error-message" style="color: red; font-size: 12px; align-self: self-start; display: none;"></span>
            <button id="submit-contact">Submit</button>
          </div>
        `;
    },

    setupEventListeners() {
        // pre existing clean up of the socket 
     this.socket.off("receiveMessage");
     this.socket.off("typing");
     this.socket.off("stopTyping");
     this.socket.off("agentStatusUpdate");
     this.socket.off("updateDashboard");
     
      const sendMessageButton = this.getElement("send-message");
      const chatInput = this.getElement("chat-input");
      const fileUploadInput = this.getElement("file-upload");
      const uploadButton = this.getElement("upload-button");
      const emojiPickerButton = this.getElement("emoji-picker");

      sendMessageButton.addEventListener("click", () => this.sendMessage());
      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendMessageButton.click();
        }
      });
      chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 48) + 'px';
      });

      this.socket.on("receiveMessage", (data) => {
        if (data.sender === "Bot" && data.threadId === this.threadId) {
          if (this.getElement("typing-indicator"))
            this.removeTypingIndicator();
          if (data.fileUrl) {
            this.appendMessage("ChatBot", {
              file_presigned_url: data.fileUrl,
              file_type: data.fileType,
              file_name: data.fileName
            });
          } else if (data.content && data.content.trim() !== "") {
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
          if (this.getElement("typing-indicator"))
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
          if (!file) return;
          // Check file size (10MB = 10 * 1024 * 1024 bytes)
          if (file.size > 10 * 1024 * 1024) {
            this.showPopup("File size must be less than 10 MB.", "error");
            event.target.value = "";
            return;
          }
          const formData = new FormData();
          formData.append("chatFile", file)
          fetch(`${BACKEND_URL}/api/message/upload`, { method: "POST", body: formData })
            .then((res) => res.json())
            .then((data) => {
              const response = data?.data
              if (response) this.storeUserMessage(response);
            }).catch((err) => { console.log(err) })
        });
      }

      if (this.options.allowEmojis)
        this.setupEmojiPicker(chatInput, emojiPickerButton);
    },

    showPopup(message, type = "success") {
      // Remove any existing popup of this type
      let popupId = `chat-widget-${type}-popup`;
      let popup = this.getElement(popupId);
      if (popup) popup.remove();
      // Find the chat widget and header
      let chatWidget = this.shadowRoot
        ? this.shadowRoot.querySelector(".jooper-chat-widget")
        : document.querySelector(".jooper-chat-widget");
      let header = chatWidget
        ? chatWidget.querySelector(".jooper-chat-header")
        : null;
      // Popup style config
      const styleMap = {
        success: {
          background: "#4CAF50",
          color: "#fff"
        },
        error: {
          background: "#f44336",
          color: "#fff"
        }
      };
      const style = styleMap[type] || styleMap.success;

      // Create new popup
      popup = document.createElement("div");
      popup.id = popupId;
      popup.style.position = "relative";
      popup.style.margin = "0 auto";
      popup.style.background = style.background;
      popup.style.color = style.color;
      popup.style.padding = "12px 24px";
      popup.style.borderRadius = "8px";
      popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      popup.style.zIndex = "99999";
      popup.style.fontSize = "15px";
      popup.style.textAlign = "center";
      popup.style.maxWidth = "90%";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.style.right = "0";
      popup.style.marginTop = "8px";
      popup.textContent = message;
      // Insert popup just after the header
      if (chatWidget && header) {
        if (header.nextSibling) {
          chatWidget.insertBefore(popup, header.nextSibling);
        } else {
          chatWidget.appendChild(popup);
        }
      } else if (chatWidget) {
        chatWidget.appendChild(popup);
      } else {
        (this.shadowRoot || document.body).appendChild(popup);
      }
      // Remove after 3 seconds
      setTimeout(() => {
        popup.remove();
      }, 3000);
    },

    setupEmojiPicker(chatInput, emojiPickerButton) {
      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://cdn.jsdelivr.net/npm/emoji-picker-element@1.26.1/picker.min.js";
      script.onload = () => {
        const picker = document.createElement("emoji-picker");
        picker.classList.add("emoji-picker-container");
        const chatWidget = this.querySelector('.jooper-chat-widget');
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
          shadowRoot.addEventListener('click', function (event) {
            event.stopPropagation();
          });
          shadowRoot.addEventListener('focusin', function (event) {
            event.stopPropagation();
          });
        }
        picker.addEventListener('click', function (event) {
          event.stopPropagation();
        });

        emojiPickerButton.addEventListener("click", (event) => {
          event.stopPropagation();
          picker.style.display =
            picker.style.display === "none" || picker.style.display === ""
              ? "block"
              : "none";
          if (picker.style.display === "block" && picker.shadowRoot) {
            setTimeout(() => {
              const searchInput = picker.shadowRoot.querySelector('input[type="search"], input.search');
              if (searchInput) {
                searchInput.style.color = '#000';
                searchInput.style.caretColor = '#000';
                searchInput.style.fontSize = '14px';
                searchInput.style.background = '#fff';
                searchInput.focus();
              }
            }, 50);
          }
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
      const getEl = this.getElement.bind(this);
      const submitButton = getEl("submit-contact");
      const closeButton = getEl("close-contact-form");
      const nameInput = getEl("contact-name");
      const emailInput = getEl("contact-email");
      const messageInput = getEl("contact-message");
      const nameError = getEl("contact-name-error");
      const emailError = getEl("contact-email-error");
      const messageError = getEl("contact-message-error");
      const iconColor = this.options.iconColor || '#007bff';

      const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      const getFieldValues = () => ({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: messageInput.value.trim()
      });

      const isFormValid = () => {
        const { name, email, message } = getFieldValues();
        return name && email && isValidEmail(email) && message;
      };

      const getNameError = () => !nameInput.value.trim() ? 'Name is required.' : '';
      const getEmailError = () => {
        const val = emailInput.value.trim();
        return !val ? 'Email is required.' : (!isValidEmail(val) ? 'Enter a valid email.' : '');
      };
      const getMessageError = () => !messageInput.value.trim() ? 'Message is required.' : '';

      const clearErrors = () => {
        [nameInput, emailInput, messageInput].forEach(input => input.style.borderColor = '');
        [[nameError], [emailError], [messageError]].forEach(([err]) => {
          if (err) {
            err.textContent = '';
            err.style.display = 'none';
          }
        });
      };

      const showError = (input, errorElem, getErrorMsg) => {
        const msg = getErrorMsg();
        if (msg) {
          input.style.borderColor = 'red';
          errorElem.textContent = msg;
          errorElem.style.display = 'block';
        } else {
          input.style.borderColor = '';
          errorElem.textContent = '';
          errorElem.style.display = 'none';
        }
      };
      const updateSubmitState = () => {
        const valid = isFormValid();
        submitButton.disabled = !valid;
        submitButton.style.opacity = valid ? '1' : '0.6';
        submitButton.style.cursor = valid ? 'pointer' : 'not-allowed';
      };
      clearErrors();
      updateSubmitState();
      const addInputListeners = (input, errorElem, getError) => {
        input.addEventListener('input', updateSubmitState);
        input.addEventListener('focus', () => input.style.borderColor = iconColor);
        input.addEventListener('blur', () => showError(input, errorElem, getError));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            if (isFormValid()) {
              e.preventDefault();
              submitButton.click();
            }
          }
        });
      };
      addInputListeners(nameInput, nameError, getNameError);
      addInputListeners(emailInput, emailError, getEmailError);
      addInputListeners(messageInput, messageError, getMessageError);

      if (closeButton) {
        closeButton.addEventListener("click", () => {
          const formContainer = getEl("contact-form-container");
          if (formContainer) formContainer.remove();
        });
      }

      if (submitButton) {
        submitButton.addEventListener("click", () => {
          const { name, email, message } = getFieldValues();
          if (isFormValid()) {
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
            const formContainer = getEl("contact-form-container");
            if (formContainer) formContainer.remove();
            this.showPopup("Ticket raised successfully");
            this.appendMessage("Bot", "Ticket has been raised successfully, someone will reach out to you shortly. Is there anything else I can help you with?");
          } else {
            showError(nameInput, nameError, getNameError);
            showError(emailInput, emailError, getEmailError);
            showError(messageInput, messageError, getMessageError);
            updateSubmitState();
            alert("Please fill in all fields with valid information.");
          }
        });
      }
    },

    appendMessage(sender, message) {
      const messagesContainer = this.getElement("jooper-chat-messages");
      const timeStr = this.getMessageTime();
      const msgElem = document.createElement("div");
      const timeElem = document.createElement("div");
      msgElem.className = `jooper-message ${sender === "User" ? "user" : "agent"}`;

      let formattedContent = [];

      // WhatsApp-like File message support for user messages
      if (typeof message === "object" && message !== null && message.file_presigned_url) {
        const fileUrl = message.file_presigned_url;
        const fileName = message.file_name || "Download file";
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
        if (isImage) {
          // WhatsApp-like image preview with download icon overlay, right-aligned
          formattedContent.push(`
            <div class="jooper-wa-image-bubble">
              <img src="${fileUrl}" alt="${fileName}" class="jooper-wa-image-preview" />
              <a href="${fileUrl}" download="${fileName}" target="_blank" class="jooper-wa-image-download-overlay" title="Download">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="18" fill="rgba(0,0,0,0.5)"/>
                  <path d="M18 11v10M18 21l-4-4m4 4l4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </div>
          `);
        } else {
          // WhatsApp-like document bubble, right-aligned
          formattedContent.push(`
            <div class="jooper-wa-doc-bubble">
              <span class="jooper-wa-doc-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="6" fill="#388e3c"/>
                  <path d="M10 8a2 2 0 0 1 2-2h8l4 4v14a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8z" fill="#fff"/>
                  <path d="M18 6v4a2 2 0 0 0 2 2h4" fill="#e0e0e0"/>
                  <rect x="14" y="18" width="6" height="2" rx="1" fill="#388e3c"/>
                  <rect x="14" y="22" width="3" height="2" rx="1" fill="#388e3c"/>
                </svg>
              </span>
              <span class="jooper-wa-doc-name">${fileName}</span>
              <a href="${fileUrl}" download="${fileName}" target="_blank" class="jooper-wa-doc-download" title="Download">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v8M10 12l-3-3m3 3l3-3" stroke=${this.options.iconColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="4" y="16" width="12" height="2" rx="1" fill=${this.options.iconColor}/>
                </svg>
              </a>
            </div>
          `);
        }
      } else {
        // Existing logic for normal messages
        const lines = (typeof message === "string" ? message : "").split("\n").filter((line) => line.trim() !== "");
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
                        return `<td class="${cellIndex === 0 ? "row-heading" : ""}"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></td>`;
                      }
                      return `<td class="${cellIndex === 0 ? "row-heading" : ""}">${cell}</td>`;
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

            const isNumberedPoint = line.match(/^\d+\.\s*\*\*(.*?)\*\*: \s*(.*)/);
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
                    return `<td class="${cellIndex === 0 ? "row-heading" : ""}"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></td>`;
                  }
                  return `<td class="${cellIndex === 0 ? "row-heading" : ""}">${cell}</td>`;
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
      const messagesContainer = this.getElement("jooper-chat-messages");
      if (!messagesContainer || this.getElement("typing-indicator"))
        return;
      const indicator = document.createElement("div");
      indicator.className = "jooper-message agent loading";
      indicator.id = "typing-indicator";
      indicator.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
      messagesContainer.appendChild(indicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    sendMessageFromSuggestion(text) {
      const chatInput = this.getElement("chat-input");
      chatInput.value = text;
      this.sendMessage();
    },

    removeTypingIndicator() {
      const indicator = this.getElement("typing-indicator");
      if (indicator) indicator.remove();
    },
  };

  global.ChatWidget = ChatWidget;
})(window);
          event.preventDefault();
          sendMessageButton.click();
        }
      });
      chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 48) + 'px';
      });

      this.socket.on("receiveMessage", (data) => {
        if (data.sender === "Bot" && data.threadId === this.threadId) {
          if (this.getElement("typing-indicator"))
            this.removeTypingIndicator();
          if (data.fileUrl) {
            this.appendMessage("ChatBot", {
              file_presigned_url: data.fileUrl,
              file_type: data.fileType,
              file_name: data.fileName
            });
          } else if (data.content && data.content.trim() !== "") {
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
          if (this.getElement("typing-indicator"))
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
          if (!file) return;
          // Check file size (10MB = 10 * 1024 * 1024 bytes)
          if (file.size > 10 * 1024 * 1024) {
            this.showPopup("File size must be less than 10 MB.", "error");
            event.target.value = "";
            return;
          }
          const formData = new FormData();
          formData.append("chatFile", file)
          fetch(`${BACKEND_URL}/api/message/upload`, { method: "POST", body: formData })
            .then((res) => res.json())
            .then((data) => {
              const response = data?.data
              if (response) this.storeUserMessage(response);
            }).catch((err) => { console.log(err) })
        });
      }

      if (this.options.allowEmojis)
        this.setupEmojiPicker(chatInput, emojiPickerButton);
    },

    showPopup(message, type = "success") {
      // Remove any existing popup of this type
      let popupId = `chat-widget-${type}-popup`;
      let popup = this.getElement(popupId);
      if (popup) popup.remove();
      // Find the chat widget and header
      let chatWidget = this.shadowRoot
        ? this.shadowRoot.querySelector(".jooper-chat-widget")
        : document.querySelector(".jooper-chat-widget");
      let header = chatWidget
        ? chatWidget.querySelector(".jooper-chat-header")
        : null;
      // Popup style config
      const styleMap = {
        success: {
          background: "#4CAF50",
          color: "#fff"
        },
        error: {
          background: "#f44336",
          color: "#fff"
        }
      };
      const style = styleMap[type] || styleMap.success;

      // Create new popup
      popup = document.createElement("div");
      popup.id = popupId;
      popup.style.position = "relative";
      popup.style.margin = "0 auto";
      popup.style.background = style.background;
      popup.style.color = style.color;
      popup.style.padding = "12px 24px";
      popup.style.borderRadius = "8px";
      popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      popup.style.zIndex = "99999";
      popup.style.fontSize = "15px";
      popup.style.textAlign = "center";
      popup.style.maxWidth = "90%";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.style.right = "0";
      popup.style.marginTop = "8px";
      popup.textContent = message;
      // Insert popup just after the header
      if (chatWidget && header) {
        if (header.nextSibling) {
          chatWidget.insertBefore(popup, header.nextSibling);
        } else {
          chatWidget.appendChild(popup);
        }
      } else if (chatWidget) {
        chatWidget.appendChild(popup);
      } else {
        (this.shadowRoot || document.body).appendChild(popup);
      }
      // Remove after 3 seconds
      setTimeout(() => {
        popup.remove();
      }, 3000);
    },

    setupEmojiPicker(chatInput, emojiPickerButton) {
      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://cdn.jsdelivr.net/npm/emoji-picker-element@1.26.1/picker.min.js";
      script.onload = () => {
        const picker = document.createElement("emoji-picker");
        picker.classList.add("emoji-picker-container");
        const chatWidget = this.querySelector('.jooper-chat-widget');
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
          shadowRoot.addEventListener('click', function (event) {
            event.stopPropagation();
          });
          shadowRoot.addEventListener('focusin', function (event) {
            event.stopPropagation();
          });
        }
        picker.addEventListener('click', function (event) {
          event.stopPropagation();
        });

        emojiPickerButton.addEventListener("click", (event) => {
          event.stopPropagation();
          picker.style.display =
            picker.style.display === "none" || picker.style.display === ""
              ? "block"
              : "none";
          if (picker.style.display === "block" && picker.shadowRoot) {
            setTimeout(() => {
              const searchInput = picker.shadowRoot.querySelector('input[type="search"], input.search');
              if (searchInput) {
                searchInput.style.color = '#000';
                searchInput.style.caretColor = '#000';
                searchInput.style.fontSize = '14px';
                searchInput.style.background = '#fff';
                searchInput.focus();
              }
            }, 50);
          }
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
      const getEl = this.getElement.bind(this);
      const submitButton = getEl("submit-contact");
      const closeButton = getEl("close-contact-form");
      const nameInput = getEl("contact-name");
      const emailInput = getEl("contact-email");
      const messageInput = getEl("contact-message");
      const nameError = getEl("contact-name-error");
      const emailError = getEl("contact-email-error");
      const messageError = getEl("contact-message-error");
      const iconColor = this.options.iconColor || '#007bff';

      const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      const getFieldValues = () => ({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: messageInput.value.trim()
      });

      const isFormValid = () => {
        const { name, email, message } = getFieldValues();
        return name && email && isValidEmail(email) && message;
      };

      const getNameError = () => !nameInput.value.trim() ? 'Name is required.' : '';
      const getEmailError = () => {
        const val = emailInput.value.trim();
        return !val ? 'Email is required.' : (!isValidEmail(val) ? 'Enter a valid email.' : '');
      };
      const getMessageError = () => !messageInput.value.trim() ? 'Message is required.' : '';

      const clearErrors = () => {
        [nameInput, emailInput, messageInput].forEach(input => input.style.borderColor = '');
        [[nameError], [emailError], [messageError]].forEach(([err]) => {
          if (err) {
            err.textContent = '';
            err.style.display = 'none';
          }
        });
      };

      const showError = (input, errorElem, getErrorMsg) => {
        const msg = getErrorMsg();
        if (msg) {
          input.style.borderColor = 'red';
          errorElem.textContent = msg;
          errorElem.style.display = 'block';
        } else {
          input.style.borderColor = '';
          errorElem.textContent = '';
          errorElem.style.display = 'none';
        }
      };
      const updateSubmitState = () => {
        const valid = isFormValid();
        submitButton.disabled = !valid;
        submitButton.style.opacity = valid ? '1' : '0.6';
        submitButton.style.cursor = valid ? 'pointer' : 'not-allowed';
      };
      clearErrors();
      updateSubmitState();
      const addInputListeners = (input, errorElem, getError) => {
        input.addEventListener('input', updateSubmitState);
        input.addEventListener('focus', () => input.style.borderColor = iconColor);
        input.addEventListener('blur', () => showError(input, errorElem, getError));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            if (isFormValid()) {
              e.preventDefault();
              submitButton.click();
            }
          }
        });
      };
      addInputListeners(nameInput, nameError, getNameError);
      addInputListeners(emailInput, emailError, getEmailError);
      addInputListeners(messageInput, messageError, getMessageError);

      if (closeButton) {
        closeButton.addEventListener("click", () => {
          const formContainer = getEl("contact-form-container");
          if (formContainer) formContainer.remove();
        });
      }

      if (submitButton) {
        submitButton.addEventListener("click", () => {
          const { name, email, message } = getFieldValues();
          if (isFormValid()) {
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
            const formContainer = getEl("contact-form-container");
            if (formContainer) formContainer.remove();
            this.showPopup("Ticket raised successfully");
            this.appendMessage("Bot", "Ticket has been raised successfully, someone will reach out to you shortly. Is there anything else I can help you with?");
          } else {
            showError(nameInput, nameError, getNameError);
            showError(emailInput, emailError, getEmailError);
            showError(messageInput, messageError, getMessageError);
            updateSubmitState();
            alert("Please fill in all fields with valid information.");
          }
        });
      }
    },

    appendMessage(sender, message) {
      const messagesContainer = this.getElement("jooper-chat-messages");
      const timeStr = this.getMessageTime();
      const msgElem = document.createElement("div");
      const timeElem = document.createElement("div");
      msgElem.className = `jooper-message ${sender === "User" ? "user" : "agent"}`;

      let formattedContent = [];

      // WhatsApp-like File message support for user messages
      if (typeof message === "object" && message !== null && message.file_presigned_url) {
        const fileUrl = message.file_presigned_url;
        const fileName = message.file_name || "Download file";
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
        if (isImage) {
          // WhatsApp-like image preview with download icon overlay, right-aligned
          formattedContent.push(`
            <div class="jooper-wa-image-bubble">
              <img src="${fileUrl}" alt="${fileName}" class="jooper-wa-image-preview" />
              <a href="${fileUrl}" download="${fileName}" target="_blank" class="jooper-wa-image-download-overlay" title="Download">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="18" fill="rgba(0,0,0,0.5)"/>
                  <path d="M18 11v10M18 21l-4-4m4 4l4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </div>
          `);
        } else {
          // WhatsApp-like document bubble, right-aligned
          formattedContent.push(`
            <div class="jooper-wa-doc-bubble">
              <span class="jooper-wa-doc-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="6" fill="#388e3c"/>
                  <path d="M10 8a2 2 0 0 1 2-2h8l4 4v14a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8z" fill="#fff"/>
                  <path d="M18 6v4a2 2 0 0 0 2 2h4" fill="#e0e0e0"/>
                  <rect x="14" y="18" width="6" height="2" rx="1" fill="#388e3c"/>
                  <rect x="14" y="22" width="3" height="2" rx="1" fill="#388e3c"/>
                </svg>
              </span>
              <span class="jooper-wa-doc-name">${fileName}</span>
              <a href="${fileUrl}" download="${fileName}" target="_blank" class="jooper-wa-doc-download" title="Download">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v8M10 12l-3-3m3 3l3-3" stroke=${this.options.iconColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="4" y="16" width="12" height="2" rx="1" fill=${this.options.iconColor}/>
                </svg>
              </a>
            </div>
          `);
        }
      } else {
        // Existing logic for normal messages
        const lines = (typeof message === "string" ? message : "").split("\n").filter((line) => line.trim() !== "");
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
                        return `<td class="${cellIndex === 0 ? "row-heading" : ""}"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></td>`;
                      }
                      return `<td class="${cellIndex === 0 ? "row-heading" : ""}">${cell}</td>`;
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

            const isNumberedPoint = line.match(/^\d+\.\s*\*\*(.*?)\*\*: \s*(.*)/);
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
                    return `<td class="${cellIndex === 0 ? "row-heading" : ""}"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a></td>`;
                  }
                  return `<td class="${cellIndex === 0 ? "row-heading" : ""}">${cell}</td>`;
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
      const messagesContainer = this.getElement("jooper-chat-messages");
      if (!messagesContainer || this.getElement("typing-indicator"))
        return;
      const indicator = document.createElement("div");
      indicator.className = "jooper-message agent loading";
      indicator.id = "typing-indicator";
      indicator.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
      messagesContainer.appendChild(indicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    sendMessageFromSuggestion(text) {
      const chatInput = this.getElement("chat-input");
      chatInput.value = text;
      this.sendMessage();
    },

    removeTypingIndicator() {
      const indicator = this.getElement("typing-indicator");
      if (indicator) indicator.remove();
    },
  };

  global.ChatWidget = ChatWidget;
})(window);