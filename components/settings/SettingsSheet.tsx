// components/settings/SettingsSheet.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Settings, Server, User, ToggleLeft, ToggleRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SwarmConfigPanel from './SwarmConfigPanel';
import { useSettings } from "@/context/SettingsContext";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export default function SettingsSheet() {
  const { isPublisher, updateSettings } = useSettings();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="p-2.5 rounded-full hover:bg-accent/80 transition-colors border border-primary/20"
          aria-label="Open settings"
        >
          <Settings size={20} className="text-primary" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto p-6">
        <SheetHeader className="pb-4 mb-4 border-b border-border">
          <SheetTitle className="font-mono">SYSTEM_SETTINGS</SheetTitle>
          <SheetDescription className="font-mono text-sm">
            Configure application settings and network connections.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="flex flex-wrap w-full gap-1 mb-6 font-mono bg-muted rounded-lg min-h-[2rem]">
              <TabsTrigger value="general" className="text-xs border border-border min-h-[2rem] w-[156px] flex items-center justify-center">
                <User size={14} className="mr-1" />
                GENERAL
              </TabsTrigger>
              <TabsTrigger value="storage" className="text-xs border border-border min-h-[2rem] w-[156px] flex items-center justify-center">
                <Server size={14} className="mr-1" />
                STORAGE
              </TabsTrigger>
            </TabsList>

            <div className="space-y-8 px-1">
              <TabsContent value="general" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg border-border">
                    <Label htmlFor="publisher-mode" className="flex flex-col gap-1">
                      <span className="font-mono">Publisher Mode</span>
                      <span className="text-xs font-normal text-muted-foreground">Enable uploading and content management features.</span>
                    </Label>
                    <Switch
                      id="publisher-mode"
                      checked={isPublisher}
                      onCheckedChange={(checked) => updateSettings({ isPublisher: checked })}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="storage" className="mt-0">
                {isPublisher ? (
                  <SwarmConfigPanel />
                ) : (
                  <div className="text-sm text-center text-muted-foreground">
                    Enable Publisher Mode to configure Swarm settings.
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
        <SheetFooter className="mt-4 border-t border-border pt-4">
          <SheetClose asChild>
            <Button variant="outline" className="mr-2">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
