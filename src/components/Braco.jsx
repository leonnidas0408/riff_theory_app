import React, { useEffect } from "react";
import { trata, atualizarBraco } from "../draw";

export default function Braco() {
    useEffect(() => {
        atualizarBraco();
    }, []);

    return (
        <canvas
            id="braco"
            width="900"
            height="260"
            onClick={(e) => trata(e.clientX, e.clientY)}
            style={{
                width: "100%",
                maxWidth: "900px",
                height: "260px",
                display: "block",
                margin: "0 auto",
                background: "transparent"
            }}
        />
    );
}