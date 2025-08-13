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
import { Settings, Server, Shield, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SwarmConfigPanel from './SwarmConfigPanel';

export default function SettingsSheet() {

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
          <Tabs defaultValue="storage" className="w-full">
            <TabsList className="flex flex-wrap w-full gap-1 mb-6 font-mono bg-muted rounded-lg min-h-[2rem]">
              
              <TabsTrigger value="storage" className="text-xs border border-border min-h-[2rem] w-[156px] flex items-center justify-center">
                <Server size={14} className="mr-1" />
                STORAGE
              </TabsTrigger>
            </TabsList>

            <div className="space-y-8 px-1">
            <TabsContent value="storage" className="mt-0">
              <SwarmConfigPanel />
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
