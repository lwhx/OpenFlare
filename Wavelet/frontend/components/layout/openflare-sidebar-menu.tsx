'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {ChevronRight} from 'lucide-react';

import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  matchesNavPath,
  openflareNavItems,
  openflareWebsiteNavGroup,
  isNavGroupActive,
} from '@/lib/navigation/openflare-nav';

export function OpenFlareSidebarMenu({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const websiteGroupActive = isNavGroupActive(pathname, openflareWebsiteNavGroup);
  const [websiteGroupOpen, setWebsiteGroupOpen] = useState(websiteGroupActive);

  useEffect(() => {
    if (websiteGroupActive) {
      setWebsiteGroupOpen(true);
    }
  }, [websiteGroupActive]);

  const renderFlatItemsBeforeGroup = openflareNavItems.slice(0, 4);
  const renderFlatItemsAfterGroup = openflareNavItems.slice(4);

  return (
    <SidebarMenu className="gap-1">
      {renderFlatItemsBeforeGroup.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={matchesNavPath(pathname, item.url, item.childUrls)}
            asChild
          >
            <Link href={item.url} onClick={onNavigate}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}

      <Collapsible
        asChild
        open={websiteGroupOpen}
        onOpenChange={setWebsiteGroupOpen}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={openflareWebsiteNavGroup.title}
              isActive={websiteGroupActive}
            >
              <openflareWebsiteNavGroup.icon />
              <span>{openflareWebsiteNavGroup.title}</span>
              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {openflareWebsiteNavGroup.items.map((item) => (
                <SidebarMenuSubItem key={item.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={matchesNavPath(pathname, item.url, item.childUrls)}
                  >
                    <Link href={item.url} onClick={onNavigate}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      {renderFlatItemsAfterGroup.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={matchesNavPath(pathname, item.url, item.childUrls)}
            asChild
          >
            <Link href={item.url} onClick={onNavigate}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}