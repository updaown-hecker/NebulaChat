"use client";

import { ThemeToggle } from "@/components/settings/theme-toggle";
import { FontSizeSelector } from "@/components/settings/font-size-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Settings</CardTitle>
          <CardDescription>Manage your NebulaChat preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">Appearance</h2>
            <Separator className="mb-4"/>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="p-3 rounded-md border">
                <h3 className="font-medium mb-1">Font Size</h3>
                <p className="text-sm text-muted-foreground mb-2">Adjust the application font size.</p>
                <FontSizeSelector />
              </div>
            </div>
          </section>

          {/* Add more settings sections here, e.g., Account, Notifications */}
          {/* 
          <section>
            <h2 className="text-xl font-semibold mb-3">Account</h2>
            <Separator className="mb-4"/>
            <div className="space-y-4">
              // Account related settings
            </div>
          </section>
          */}
        </CardContent>
      </Card>
    </div>
  );
}
