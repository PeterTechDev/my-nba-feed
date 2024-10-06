import { ArrowLeft, ArrowRight } from "phosphor-react";
import { useEffect, useRef, useState } from "react";
import { StyledScrollButton, TabsContainer } from "./styles/Tabs.styles";
import { TabsProvider } from "./TabsContext";
import { TabContent } from "./TabsElements/TabContent";
import { TabMenu } from "./TabsElements/TabMenu";

export const Tabs = () => {
  const tabMenuRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check if the tab menu can be scrolled left or right
  useEffect(() => {
    const tabMenu = tabMenuRef.current;

    const handleScroll = () => {
      if (tabMenu) {
        setCanScrollLeft(tabMenu.scrollLeft > 0);

        setCanScrollRight(
          tabMenu.scrollLeft + tabMenu.clientWidth < tabMenu.scrollWidth - 1
        );
      }
    };

    handleScroll(); // Initial check
    window.addEventListener("resize", handleScroll); // Listen for resize events
    if (tabMenu) {
      tabMenu.addEventListener("scroll", handleScroll); // Listen for scroll events
    }

    return () => {
      window.removeEventListener("resize", handleScroll); // Cleanup resize listener
      if (tabMenu) {
        tabMenu.removeEventListener("scroll", handleScroll); // Cleanup scroll listener
      }
    };
  }, []);

  const scrollLeft = () => {
    if (tabMenuRef.current) {
      tabMenuRef.current.scrollBy({ left: -100, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (tabMenuRef.current) {
      tabMenuRef.current.scrollBy({ left: 100, behavior: "smooth" });
    }
  };

  return (
    <TabsProvider>
      <TabsContainer>
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <StyledScrollButton onClick={scrollLeft} className="left">
            <ArrowLeft size={24} />
          </StyledScrollButton>
        )}

        {/* Tab Menu */}
        <TabMenu ref={tabMenuRef} />

        {/* Right Scroll Button */}
        {canScrollRight && (
          <StyledScrollButton onClick={scrollRight} className="right">
            <ArrowRight size={24} />
          </StyledScrollButton>
        )}

        {/* Tab Content */}
      </TabsContainer>
      <TabContent />
    </TabsProvider>
  );
};
