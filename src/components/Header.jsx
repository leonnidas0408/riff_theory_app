import React from "react";

export default function Header() {
    return (
        <header style={{ flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
            <h2 style={{ fontFamily: "inherit", fontSize: "22px" }}>Olá, músico 👋</h2>
            <span>Bora evoluir hoje?</span>
        </header>
    )
}