import React, { useEffect, useRef, useState } from "react";
import "./index.css";
import Chat from "../../assets/chat.png";
import Avatar from "../../assets/avatar.png";
import Call from "../../assets/call.png";
import Send from "../../assets/send.png";
import File from "../../assets/file.png";
import logout from "../../assets/logout.png";
import { io } from "socket.io-client";

const Dashboard = () => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user:detail"))
  );
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const messageEndRef = useRef(null); // Ref for the end of the message list

  useEffect(() => {
    const socketInstance = io("http://localhost:8080");
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect(); // Clean up on unmount
    };
  }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit("addUser ", user?.id);
      socket.on("getUsers", (users) => {
        console.log("activeUsers :>> ", users);
      });
      socket.on("getMessage", (data) => {
        setMessages((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            { user: data.user, message: data.message },
          ],
        }));
      });
    }
  }, [socket, user]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/conversations/${user?.id}`
        );
        if (!res.ok) throw new Error("Failed to fetch conversations");
        const resData = await res.json();
        setConversations(resData);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/users/${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const resData = await res.json();
        setUsers(resData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  const fetchMessages = async (conversationId, receiver) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/message/${conversationId}?senderId=${user?.id}&&receiverId=${receiver?.receiverId}`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const resData = await res.json();
      setMessages({ messages: resData, receiver, conversationId });
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); // Scroll to the bottom
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return; // Prevent sending empty messages

    const newMessage = {
        user: { id: user?.id, fullName: user?.fullName },
        message: trimmedMessage,
    };

    // Update local messages state immediately
    setMessages((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
    }));

    // Emit the message to the socket
    socket?.emit("sendMessage", {
        senderId: user?.id,
        receiverId: messages?.receiver?.receiverId,
        message: trimmedMessage,
        conversationId: messages?.conversationId,
    });

    // Send the message to the server
    try {
        const res = await fetch(`http://localhost:8000/api/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                conversationId: messages?.conversationId,
                senderId: user?.id,
                message: trimmedMessage,
                receiverId: messages?.receiver?.receiverId,
            }),
        });

        // Check if the response is OK
        if (!res.ok) {
            const errorText = await res.text(); // Get the response text
            throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }

        // Parse the response as JSON
        const data = await res.json();
        console.log(data); // Log the response data

        // Clear the input field
        setMessage("");
    } catch (error) {
        console.error("Error sending message:", error);
        // Optionally, show an error message to the user
    }
};

  // Scroll to the last message whenever messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-screen h-[100vh] flex items-center justify-center overflow-hidden ">
      {/* Left part */}
      <div className="w-[25%] h-screen bg-sky-100">
        <div className="flex h-[80px] my-8 mx-16 justify-center items-center">
          <div className="fit-v chat">
            <img src={Chat} width={70} height={70} alt="" />
          </div>
          <div className="ml-8">
            <h3 className="text-2xl">{user?.fullName}</h3>
            <p className="text-lg font-light">My profiles</p>
          </div>
        </div>
        <hr className="hr" />
        <div className="overflow-y-auto h-[73%] ">
          <div className=" mt-10">
            <div className="text-sky-600 text-3xl ml-[0.5vh]">Message</div>
            <div className="overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map(({ conversationId, user }) => {
                  return (
                    <div
                      key={conversationId}
                      className="flex items-center py-8 border-b border-b-grey-300 message pl-[2vh]"
                    >
                      <div
                        className="cursor-pointer flex items-center"
                        onClick={() => fetchMessages(conversationId, user)}
                      >
                        <div className="rounded-full">
                          <img src={Avatar} width={60} height={60} alt="" />
                        </div>
                        <div className="ml-8">
                          <h3 className="text-2xl">{user?.fullName}</h3>
                          <p className="font-light text-grey-600 text-sm">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center font-semibold mt-12">
                  No conversation available
                </div>
              )}
            </div>
          </div>
        </div>
        <hr />
        <div className="flex items-center justify-between mx-3 mt-4">
          <div className="">
            <img src={logout} alt="" className="h-[30px]" />
          </div>
        </div>
      </div>

      {/* Middle part */}
      <div className="w-[50%] h-screen flex flex-col items-center justify-end gap-3">
        {messages?.receiver?.fullName && (
          <div className="w-[75%] bg-secondary h-[80px] mt-7 mb-7 rounded-full flex items-center px-14 shadow-sm">
            <div className="cursor-pointer avatar">
              <img
                src={Avatar}
                width={60}
                height={60}
                alt=""
                className="rounded-full"
              />
            </div>
            <div className="ml-6 mr-auto">
              <h3 className="text-2xl">{messages?.receiver?.fullName}</h3>
              <p className="text-sm font-light text-grey-600">Online</p>
            </div>
            <div className="cursor-pointer call p-3">
              <img src={Call} width={30} height={30} alt="" />
            </div>
          </div>
        )}

        {/* Message section */}
        <div className={`h-[75%] border w-full overflow-y-auto`}>
          <div className="px-10 py-14 flex flex-col gap-3">
            {messages?.messages?.length > 0 ? (
              messages.messages.map(({ message, user: { id } = {} }, index) => {
                return (
                  <div
                    key={index} // Ideally, use a unique identifier instead of index
                    className={`w-[300px] rounded-b-xl p-2 ml-auto ${
                      id === user?.id
                        ? "text-white bg-sky-600 rounded-tl-xl ml-auto"
                        : "bg-secondary rounded-tr-xl margin"
                    }`}
                  >
                    {message}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-lg font-semibold mt-24 overflow-hidden">
                No Messages selected
              </div>
            )}
            <div ref={messageEndRef}></div> {/* Scroll to this ref */}
          </div>
        </div>

        {messages?.receiver?.fullName && (
          <div className="p-6 w-full flex items-center">
            <input
              type="text"
              className="w-[80%] p-4 border-0 shadow-md rounded-full bg-secondary focus:ring-0 focus:border-0 outline-none"
              placeholder="Enter text......"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div
              className="ml-4 p-3 cursor-pointer bg-light rounded-full send"
              onClick={sendMessage}
            >
              <img src={Send} height={30} width={30} alt="" />
            </div>
            <div className="ml-4 p-3 cursor-pointer bg-light rounded-full send">
              <img src={File} height={30} width={30} alt="" />
            </div>
          </div>
        )}
      </div>

      {/* Right part */}
      <div className="w-[25%] h-screen bg-light px-8 py-8 overflow-x-hidden bg-sky-100 p-3">
        <div className="text-primary text-3xl">People</div>
        <div>
          {users.length > 0 ? (
            users.map(({ userId, user }) => (
              <div
                className="flex items-center py-8 border-b border-b-gray-300"
                key={userId}
              >
                <div
                  className="cursor-pointer flex items-center"
                  onClick={() => fetchMessages("new", user)}
                >
                  <div>
                    <img
                      src={Avatar}
                      className="w-[60px] h-[60px] rounded-full p-[2px] border border-primary"
                      alt=""
                    />
                  </div>
                  <div className="ml-6">
                    <h3 className="text-lg font-semibold">{user?.fullName}</h3>
                    <p className="text-sm font-light text-gray-600">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-lg font-semibold mt-24">
              No any member added
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
