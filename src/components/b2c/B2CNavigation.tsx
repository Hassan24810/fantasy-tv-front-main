import React, { useState } from "react";
import { useShow } from "@/contexts/ShowContext";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { B2CProfileModal } from "./B2CProfileModal";
import { Menu, X } from "lucide-react";

interface B2CNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  username?: string;
  avatarUrl?: string | null;
  showUserId?: string;
  userId?: string;
  onProfileUpdated?: (username: string, avatarUrl: string | null) => void;
}

export const B2CNavigation = ({
  activeTab,
  onTabChange,
  onLogout,
  username,
  avatarUrl,
  showUserId,
  userId,
  onProfileUpdated,
}: B2CNavigationProps) => {
  const { show } = useShow();
  const { t } = useTranslation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: "home", label: t('nav.home') },
    { id: "events", label: t('nav.events') },
    { id: "participants", label: t('nav.participants') },
    { id: "rules", label: t('nav.rules') },
    { id: "leagues", label: t('nav.leagues') },
  ];

  return (
    <>
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1480px] mx-auto">
          <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
            
            {/* LEFT SIDE: Tabs with padding from the left edge */}
            <div className="hidden md:flex items-center pl-6 lg:pl-10">
              {tabs.map((tab, index) => (
                <div key={tab.id} className="flex items-center">
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`relative px-8 py-2 text-[15px] font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                    
                    {/* ACTIVE INDICATOR - Positioned slightly higher than the bottom border */}
                    {activeTab === tab.id && (
                      <span 
                        className="absolute -bottom-[18px] left-1/2 -translate-x-1/2 h-[3.5px] w-12 rounded-full"
                        style={{ backgroundColor: 'var(--show-primary, #3b82f6)' }}
                      />
                    )}
                  </button>

                  {/* THIN VERTICAL DIVIDER */}
                  {index !== tabs.length - 1 && (
                    <div className="h-4 w-[1px] bg-gray-200 mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* RIGHT SIDE: Logout Button */}
            <div className="hidden md:flex items-center pr-2">
              <Button
                onClick={onLogout}
                className="px-10 rounded-xl text-white font-semibold shadow-md shadow-blue-100 hover:opacity-90 transition-all active:scale-95"
                style={{ backgroundColor: 'var(--show-primary, #3b82f6)' }}
              >
                {t('nav.logout')}
              </Button>
            </div>

            {/* MOBILE HEADER VIEW */}
            <div className="md:hidden flex items-center justify-between w-full">
               <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-2 text-gray-600 border rounded-lg hover:bg-gray-50"
               >
                 {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
               </button>
               <span className="font-semibold text-gray-800">
                {tabs.find(t => t.id === activeTab)?.label}
               </span>
               <div className="w-10" /> {/* Balance spacer */}
            </div>
          </div>
        </div>

        {/* MOBILE SLIDE-DOWN MENU */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-2 animate-in slide-in-from-top-2 duration-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-8 py-4 text-base font-medium ${
                  activeTab === tab.id ? "text-blue-600 bg-blue-50/50" : "text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="px-8 py-4">
              <Button 
                onClick={onLogout} 
                className="w-full py-6 text-lg rounded-xl" 
                style={{ backgroundColor: 'var(--show-primary)' }}
              >
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* PROFILE MODAL LOGIC */}
      {showUserId && userId && show?.id && (
        <B2CProfileModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          showUserId={showUserId}
          userId={userId}
          currentUsername={username || ""}
          currentAvatarUrl={avatarUrl || null}
          showId={show.id}
          onProfileUpdated={onProfileUpdated}
        />
      )}
    </>
  );
};