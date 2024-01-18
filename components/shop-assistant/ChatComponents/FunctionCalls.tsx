import {
  Content,
  Message,
  MessageContentAudio,
  MessageContentFile,
  MessageContentText,
  Product,
} from "../types/shop-assistant.ts";
import AddToCartButton from "$store/islands/AddToCartButton/vtex.tsx";
import { useSignal } from "@preact/signals";
import { useState } from "preact/hooks";
import Icon from "$store/components/ui/Icon.tsx";

export function FunctionCalls({ messages }: { messages: Message[] }) {
  const isFunctionCallContent = (
    content:
      | MessageContentText
      | MessageContentFile
      | MessageContentAudio
      | Content,
  ): content is Content => {
    return (content as Content).response !== undefined;
  };

  return (
    <div className="overflow-y-auto overflow-x-auto">
      {(() => {
        const allProducts: Product[] = messages
          .filter((message) => message.type === "function_calls")
          .flatMap((message) =>
            message.content
              .filter(isFunctionCallContent)
              .filter(
                (content) =>
                  content.name ===
                    "vtex/loaders/intelligentSearch/productList.ts" &&
                  content.response.length !== 0,
              )
              .flatMap((content) => content.response as Product[])
          );

        if (allProducts.length > 0) {
          return (
            <>
              <div className="hidden lg:block">
                <ProductShelf key="shelf" products={allProducts} />
              </div>
              <div className="block lg:hidden">
                <ProductCarousel key="carousel" products={allProducts} />
              </div>
            </>
          );
        }
      })()}
    </div>
  );
}

function extractTitleAndDescription(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  const title = doc.querySelector("h1, h2, h3, h4, h5, h6")?.textContent ||
    "";

  const titleElement = doc.querySelector("h1, h2, h3, h4, h5, h6");
  if (titleElement) titleElement.remove();
  const description = doc.body.textContent || "";

  return { title, description };
}

function ProductShelf({ products }: { products: Product[] }) {
  console.log(products);
  return (
    <div class="flex flex-row lg:flex-col w-auto gap-4 ml-6">
      {products.map((product, index) => (
        <div
          key={index}
          style={{
            animation: `messageAppear 300ms linear ${index * 600}ms`,
            animationFillMode: "backwards",
          }}
        >
          <ProductCard key={index} product={product} />
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { title, description } = extractTitleAndDescription(
    product.description,
  );
  return (
    <div class="flex flex-row items-center bg-white gap-4 rounded-2xl text-black p-4">
      <a
        href={product.url}
        target="_self"
        rel="noopener noreferrer"
      >
        <img
          src={product.image[0].url}
          alt={product.name}
          class="w-fit h-44 max-w-fit rounded-md"
        />
      </a>
      <div class="flex flex-col w-full h-full space-y-4 py-4">
        <a
          href={product.url}
          target="_self"
          rel="noopener noreferrer"
        >
          <p class="text-xs font-semibold">{product.name}</p>
        </a>
        <p class="text-xs overflow-y-auto font-light max-h-16">
          {description}
        </p>
        <div class="flex justify-between items-center">
          <p class="text-lg">
            {product.offers.priceCurrency} {product.offers.offers[0].price}
          </p>
          <AddToCartButton
            productID={product.productID}
            seller={product.offers.offers[0].seller}
            eventParams={{ items: [] }}
          />
        </div>
      </div>
    </div>
  );
}

const ProductCarousel = ({ products }: { products: Product[] }) => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const product = products[currentProductIndex] as Product;
  const { title, description } = extractTitleAndDescription(
    product.description,
  );

  const handleNextProduct = () => {
    setCurrentProductIndex((
      prevIndex,
    ) => (prevIndex === products.length - 1 ? 0 : prevIndex + 1));
  };

  const handlePrevProduct = () => {
    setCurrentProductIndex((
      prevIndex,
    ) => (prevIndex === 0 ? products.length - 1 : prevIndex - 1));
  };

  return (
    <div class="flex items-center justify-center h-fit text-black">
      <div class="bg-white shadow-lg rounded-2xl">
        <div class="relative text-white">
          <button
            class="absolute left-0 top-1/2 transform -translate-y-1/2 bg-primary-90 rounded-full ml-2"
            onClick={handlePrevProduct}
          >
            <Icon
              id="ChevronLeft"
              class="text-tertiary p-1"
              height={24}
              width={24}
              strokeWidth={2}
            />
          </button>
          <button
            class="absolute right-0 top-1/2 transform -translate-y-1/2 bg-primary-90 rounded-full mr-2"
            onClick={handleNextProduct}
          >
            <Icon
              id="ChevronRight"
              class="text-tertiary p-1"
              height={24}
              width={24}
            />
          </button>
          <div class="flex flex-row gap-4 text-black text-xs px-12 py-4 items-center min-h-44">
            <a
              href={product.url}
              target="_self"
              rel="noopener noreferrer"
              class="flex justify-center"
            >
              <img
                src={product.image[0].url}
                alt={product.image[0].name}
                class="w-fit h-32 max-w-fit rounded-md"
              />
            </a>
            <div class="flex flex-col gap-4 w-full max-w-[10rem]">
              <a
                href={product.url}
                target="_self"
                rel="noopener noreferrer"
              >
                <h2 class="font-bold">
                  {product.name}
                </h2>
              </a>
              <p class="font-light">
                {product.offers.priceCurrency} {product.offers.offers[0].price}
              </p>
              <AddToCartButton
                productID={product.productID}
                seller={product.offers.offers[0].seller}
                eventParams={{ items: [] }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
