// ChatbotAvatar.tsx
import React from "react";
import "./ChatbotAvatar.css"; // Assuming you have a CSS file for styling

const ChatbotAvatar: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <div className={`chatbot-avatar ${isSpeaking ? "speaking" : ""}`}>
      <img src="/assets/images/chatbot1.png" alt="Chatbot" />
      <div className="mouth" />
    </div>
  );
};

export default ChatbotAvatar;
