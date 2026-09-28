import React from "react";

export default function IconButton({onClick, label, icon, selected}) {
    return (
        <button onClick={onClick} className={`icon-button${selected ? " selected" : ""}`}>
            <img src={icon}></img>
            <span>{label}</span>
        </button>
    )
}