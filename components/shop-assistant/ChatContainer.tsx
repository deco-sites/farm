import { Signal } from "@preact/signals";
import { Content, Message } from "./types/shop-assistant.ts";
import { useEffect, useState } from "preact/hooks";
import { ChatStep } from "./ChatComponents/ChatStep.tsx";
import Image from "apps/website/components/Image.tsx";
import Icon from "../ui/Icon.tsx";

type ChatProps = {
  messageList: Signal<Message[]>;
  addNewMessageToList: ({ content, type, role }: Message) => void;
  send: (text: string) => void;
  handleShowChat: () => void;
  logo?: { src: string; alt: string };
  updateMessageListArray: (messageList: Message[]) => void;
};

export function ChatContainer(
  {
    messageList,
    addNewMessageToList,
    send,
    handleShowChat,
    logo,
    updateMessageListArray,
  }: ChatProps,
) {
  const [shouldAnimateWidth, setShouldAnimateWidth] = useState(false);

  useEffect(() => {
    const localMsgList = [...messageList.value];
    const hasFunctionCalls = localMsgList.some((msg) =>
      msg.type === "function_calls"
    );
    const functionCallMsg = localMsgList.reverse().find((msg) =>
      msg.type === "function_calls"
    );
    setShouldAnimateWidth(
      hasFunctionCalls &&
        (functionCallMsg?.content?.[0] as Content)?.response.length !== 0,
    );
  }, [messageList.value]);

  const handleClearChat = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the chat? This action cannot be undone.",
      )
    ) {
      updateMessageListArray([]);
    }
  };

  return (
    <>
      <style>
        {`@keyframes widthIncrease {
          from {
            width: 25rem;
          }
          to {
            width: 60rem;
          }
        }`}
      </style>
      <div
        style={{
          animation: shouldAnimateWidth ? "widthIncrease 200ms linear" : "none",
          transition: "width 200ms",
        }}
        class={`p-4 gap-4 h-fit max-h-[80vh] shadow-lg outline-white/30 outline outline-8 rounded-t-3xl sm:rounded-t-[1.5rem] rounded-b-none sm:rounded-b-[1.5rem] flex flex-col bg-primary-90
        w-full ${
          shouldAnimateWidth
            ? "lg:w-[60rem] max-w-[25rem] lg:max-w-[60rem]"
            : "lg:w-[25rem] max-w-[25rem]"
        }`}
      >
        <div class="flex items-center flex-row justify-between">
          <div class="bg-[var(--secondary-color-hex)] rounded-full flex justify-center items-center w-fit">
            {logo
              ? (
                <Image
                  class="m-2 w-6 h-6"
                  src={logo.src}
                  alt={logo.alt}
                  width={24}
                  height={24}
                />
              )
              : <img src="/deco-icon.svg"></img>}
          </div>
          <div class="gap-4 flex items-center flex-row">
            <button
              onClick={handleClearChat}
              class="group absolute right-16"
            >
              <span class="text-tertiary font-light">Clear</span>
            </button>
            <button onClick={handleShowChat}>
              <Icon id="Close" class="text-tertiary" height={20} width={20} />
            </button>
          </div>
        </div>
        <ChatStep
          send={send}
          messageList={messageList}
          addNewMessageToList={addNewMessageToList}
          updateMessageListArray={updateMessageListArray}
        />
      </div>
    </>
  );
}
