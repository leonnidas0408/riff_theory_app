import { React, useState } from "react";
import IconButton from "./IconButton";

export default function BottomBar({page, setPage, pageData, defaultPage}) {
    return (
        <div>
            <div>
                {pageData[page].page}
            </div>
            <div className="bottom-bar">
                {Object.entries(pageData).map(([key, item]) => (
                    <IconButton onClick={() => setPage(key)} label={key} icon={item.icon} selected={page === key}/>
                ))}
            </div>
        </div>
        
    )
}