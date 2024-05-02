import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Button } from "@mui/material";

// Styles for the component

export default function Navbar() {
  return (
    <div style={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{ backgroundColor: "white", boxShadow: "none" }}
      >
        <Toolbar>
          <img
            src="/esgerlogo.png"
            alt="Logo"
            style={{ height: 41, width: 133 }}
          />

          <Button
            href="https://www.esger.co/blog"
            style={{
              textDecoration: "none",
              color: "black", // or a specific color you want
              textTransform: "none", // this prevents the text from being uppercase
              letterSpacing: "0.05em",
              marginLeft: 16,
              fontWeight: 500,
              fontSize: 18,
            }}
          >
            Blog
          </Button>
        </Toolbar>
      </AppBar>
    </div>
  );
}
