import React from "react";

export default function DramaticCTA({ actions }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "center"
        }}>
            {
                actions.map((item, index) => (
                    <span style={{
                        display: "flex"
                    }}>
                        <span>{item}</span>
                        {index !== actions.length - 1 ? <div className="cta-separator"></div> : <span></span>}
                    </span>
                ))
            }
        </div>
    )
}