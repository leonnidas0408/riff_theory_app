import React from "react";
import SidebarPages from "./SidebarPages";
import BottomBar from "./BottomBarPages";
import { isDesktop } from "react-device-detect";

export default function NavbarAdapter({page, setPage, pageData, defaultPage}) {
    return (
        <div>
            {
                isDesktop ?
                <SidebarPages page={page} setPage={setPage} pageData={pageData} defaultPage={defaultPage}/>
                : <BottomBar page={page} setPage={setPage} pageData={pageData} defaultPage={defaultPage}/>
            }
        </div>
    )
}