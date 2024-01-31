import { createContext } from "preact";
import { useContext, useState } from "preact/hooks";

const ChatContext = createContext({
  isCartExpanded: false,
  toggleCart: (state: boolean) => {},
});

interface ChatProviderProps {
  children: preact.ComponentChildren;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [isCartExpanded, setCartExpanded] = useState(false);

  const toggleCart = (state: boolean) => {
    setCartExpanded(state);
  };

  return (
    <ChatContext.Provider
      value={{ isCartExpanded, toggleCart }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useCart() {
  return useContext(ChatContext);
}
