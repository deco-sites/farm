import { useRef } from "preact/hooks";
import { Messages } from "./Messages.tsx";
import {
  Message,
  MessageContentAudio,
  MessageContentFile,
  MessageContentText,
} from "../types/shop-assistant.ts";
import { Signal } from "@preact/signals";
import { FunctionCalls } from "./FunctionCalls.tsx";
import { useState } from "preact/hooks";
import Icon from "$store/components/ui/Icon.tsx";
import { invoke } from "$store/runtime.ts";
import AutosizeTextarea from "$store/components/autosize-textarea/AutosizeTextarea.tsx";

type ChatProps = {
  messageList: Signal<Message[]>;
  addNewMessageToList: ({ content, type, role }: Message) => void;
  send: (text: string) => void;
  updateMessageListArray: (messageList: Message[]) => void;
};

// TODO(ItamarRocha): Refactor and remove this
type ProcessedFileInfo = {
  fileUrl: string;
  base64: string | ArrayBuffer | null;
  file: File | null;
};

export function ChatStep(
  { messageList, addNewMessageToList, send, updateMessageListArray }: ChatProps,
) {
  return (
    <div class="text-tertiary min-h-full flex justify-between w-full flex-row">
      <div class="min-w-2/5 flex flex-col justify-between gap-4 w-full">
        <Messages
          messageList={messageList.value}
          send={send}
          addNewMessageToList={addNewMessageToList}
          updateMessageListArray={updateMessageListArray}
        />
        <div class="lg:hidden block">
          <FunctionCalls messages={messageList.value} />
        </div>
        <InputArea send={send} addNewMessageToList={addNewMessageToList} />
      </div>
      <div class="hidden lg:flex max-w-[60%]">
        <FunctionCalls messages={messageList.value} />
      </div>
    </div>
  );
}

type InputAreaProps = {
  send: (text: string) => void;
  addNewMessageToList: ({ content, type, role }: Message) => void;
};

function getBase64(file: File | Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function InputArea({ send, addNewMessageToList }: InputAreaProps) {
  const [currentFile, setCurrentFile] = useState<File | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("video/mp4");
  const audioChunksRef = useRef<BlobPart[]>([]);
  const userInput = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSubmit = async () => {
    const inputValue = userInput.current?.value;
    if (!inputValue) return;

    // Handle file input and send message if there is a file
    if (currentFile) {
      const fileUrl = URL.createObjectURL(currentFile);
      const msgContent: MessageContentFile[] = [{
        type: "file",
        url: fileUrl,
        message: inputValue,
      }];

      addNewMessageToList({
        content: msgContent,
        type: "message",
        role: "user",
      });

      const base64 = await getBase64(currentFile);

      userInput.current.value = "";
      setCurrentFile(null);

      const uploadURL = await invoke["ai-assistants"].actions
        .awsUploadImage({ file: base64 });
      const description = await invoke["ai-assistants"].actions
        .describeImage({ uploadURL: uploadURL, userPrompt: inputValue });

      const imageDescription = description.choices[0].message.content;
      const concatenatedMessage = `${inputValue}. Find ${imageDescription}`;

      send(concatenatedMessage);

      return;
    }

    send(inputValue);

    const msgContent: MessageContentText[] = [{
      type: "text",
      value: inputValue,
      options: [],
    }];

    addNewMessageToList({
      content: msgContent,
      type: "message",
      role: "user",
    });

    userInput.current.value = "";
  };

  const handleUserInput = (e: React.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processSubmit();
    }
  };

  const processFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<ProcessedFileInfo | null> => {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file) return null;
      const fileUrl = URL.createObjectURL(file);
      const base64 = await getBase64(file);
      return { fileUrl, base64, file };
    }
    return null;
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const processedFileInfo = await processFileUpload(event);

    if (!processedFileInfo) return;

    setCurrentFile(processedFileInfo.file);
  };

  const startRecording = async () => {
    try {
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeTypeRef.current = "audio/webm"; // works on most desktop browsers
      } else if (MediaRecorder.isTypeSupported("audio/wav")) {
        mimeTypeRef.current = "audio/wav";
      }

      // Ask for permission to use the microphone and start recording
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
        mimeType: mimeTypeRef.current,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;
      mediaRecorderRef.current.start(1000);

      setIsRecording(true); // Change the state to reflect that recording has started
    } catch (error) {
      // Handle the error appropriately
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop(); // This will trigger the 'onstop' event
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setIsRecording(false); // Update the state to reflect that recording has stopped
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, {
      type: mimeTypeRef.current,
    });

    audioChunksRef.current = []; // Clear the recorded chunks

    const base64 = await getBase64(audioBlob);
    const transcription = await invoke["ai-assistants"].actions
      .transcribeAudio({ file: base64 });

    if (!transcription.text) return;

    send(transcription.text);

    const msgContent: MessageContentAudio[] = [{
      type: "audio",
      text: transcription.text,
      url: URL.createObjectURL(audioBlob),
    }];

    addNewMessageToList({
      content: msgContent,
      type: "message",
      role: "user",
    });

    setIsRecording(false);
  };

  const handleAudioClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const removeFile = () => {
    setCurrentFile(null);
  };

  const handleFileClick = (event: MouseEvent) => {
    event.stopPropagation();
    fileInputRef.current && fileInputRef.current.click();
  };

  return (
    <>
      <style>
        {`@keyframes blink-animation {
         0% {
           color: white;
         }
         50% {
           color: red;
         }
         100% {
           color: white;
         }
       }
       `}
      </style>
      <form onSubmit={handleUserInput} class="sticky">
        {currentFile && (
          <FilePreview
            removeFile={removeFile}
            fileUrl={URL.createObjectURL(currentFile)}
          />
        )}
        <div class="flex p-4 items-center relative w-full bg-secondary-50 rounded-[2rem]">
          <AutosizeTextarea
            maxRows={7}
            minRows={1}
            class="w-72 resize-none h-5 pr-11 sm:pr-2 text-tertiary bg-transparent text-sm placeholder:text-tertiary placeholder:opacity-50 focus-visible:outline-0"
            ref={userInput}
            name="userInput"
            placeholder="Type to reply"
            aria-label="Chat input area"
            onKeyDown={handleKeydown}
          />
          <div class="absolute right-4 flex flex-row gap-2">
            <div
              onClick={handleFileClick}
              class="cursor-pointer flex items-center justify-center"
            >
              <Icon
                id="Camera"
                class="text-tertiary"
                height={20}
                width={20}
              />
              <input
                id="fileInput"
                type="file"
                ref={fileInputRef}
                name="fileInput"
                aria-label="File input"
                onChange={handleFileChange}
                class="sr-only" // Hides visually but keeps it accessible
                accept="image/*"
              />
            </div>
            <div
              onClick={handleAudioClick}
              class="cursor-pointer flex items-center justify-center"
            >
              <Icon
                id="Microphone"
                style={{
                  animation: isRecording
                    ? "blink-animation 1s linear infinite"
                    : "",
                }}
                class="text-tertiary"
                height={20}
                width={20}
              />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

type FilePreviewProps = {
  fileUrl: string;
  removeFile: () => void;
};

function FilePreview({ fileUrl, removeFile }: FilePreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const closeModal = (event: MouseEvent) => {
    if (event.currentTarget === event.target) {
      setIsModalOpen(false);
    }
  };

  return (
    <div class="ml-4 mb-4 w-fit relative">
      <img
        onClick={toggleModal}
        src={fileUrl}
        alt="file preview"
        class="w-14 rounded-xl relative hover:cursor-pointer"
      />
      <button
        onClick={removeFile}
        class="bg-gray-500 hover:bg-black rounded-full h-fit absolute right-1 top-1 -translate-y-1/2 translate-x-1/2 group"
      >
        <Icon
          id="Close"
          class="text-tertiary m-1"
          height={16}
          width={16}
        />
        <span class="absolute bottom-0 left-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2">
          Remove File
        </span>
      </button>
      {/* TODO: Use Portals to make the modal fit the whole screen */}
      {isModalOpen && (
        <div
          onClick={closeModal}
          class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 m-16"
        >
          <div class="relative p-8 max-w-screen-md max-h-screen-md">
            <img
              src={fileUrl}
              alt="Enlarged file preview"
              class="max-w-80 max-h-80"
            />
            <Icon
              id="Close"
              onClick={toggleModal}
              width={24}
              height={24}
              class="absolute cursor-pointer top-0 right-4 bg-white p-1 rounded-full text-black"
              aria-label="Close"
            />
          </div>
        </div>
      )}
    </div>
  );
}
