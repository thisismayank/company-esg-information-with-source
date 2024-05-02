import React, { useEffect, useState, useRef } from "react";
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Grid,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import io from "socket.io-client";

import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import { styled } from "@mui/material/styles";
import Lottie from "react-lottie";
import animationData from "./lottie-1.json"; // Import your Lottie animation file
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./navbar";

const sliderVariants = {
  initial: {
    x: 0,
  },
  animate: {
    x: "-220%",
    transition: {
      repeat: Infinity,
      repeatType: "loop",
      duration: 40,
    },
  },
};
const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: animationData,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const App = () => {
  const [companyName, setCompanyName] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(null);
  const [isCompanyValid, setIsCompanyValid] = useState(true);
  const socket = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socket.current = io("http://localhost:8000", {
      withCredentials: true,
    });

    socket.current.on("connect", () => {
      console.log(`Connected with ID: ${socket.current.id}`);
    });

    socket.current.on("update", (message) => {
      console.log("Update from server:", message);
      toast.info(message, { autoClose: 2000 });
    });

    socket.current.on("processComplete", (result) => {
      console.log("Process completed:", result);
    });

    socket.current.on("modelProcessing", (message) => {
      toast.info(message, { autoClose: 5000 });
    });

    socket.current.on("error", (errorMessage) => {
      toast.error(errorMessage, { autoClose: 5000 });
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);
  const handleInputChange = (event) => {
    setCompanyName(event.target.value);
  };

  const handleSubmit = async () => {
    if (!socket.current || !socket.current.connected) {
      toast.error("Not connected to the server", { autoClose: 2000 });
      return;
    }
    setLoading(true);
    setLogo(null);
    try {
      const response = await axios.post(
        "http://localhost:8000/v1/esgers/check",
        { company: companyName, socketId: socket.current.id }
      );
      console.log("response.data.results", response.data);

      if (!response.data.success) {
        setIsCompanyValid(false);
        toast.error("Invalid company name!", { autoClose: 2000 });
      } else {
        toast.success("Response generated successfully!", { autoClose: 2000 });
        setIsCompanyValid(true);

        setData({
          ...data,
          questions: response.data.results,
          // questions: result.results,
        });
        // const logoInfo = response.data.results.companyLogoAndValidity.logo
        setLogo(response.data.companyLogoAndValidity.image);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setData(null); // Handle errors as you prefer
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      {logo && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          maxHeight="100px" // This makes the Box take up at least the full height of the viewport
          style={{
            position: "relative", // Ensures that the Box itself is positioned relative to its normal position
          }}
        >
          <img
            src={logo}
            style={{
              maxHeight: 100,
              maxWidth: 600,
              margin: "auto", // Centers the image within the flex container
            }}
          />
        </Box>
      )}
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="flex-start"
        minHeight="100vh"
      >
        <Box width="100%" maxWidth="500px">
          <TextField
            fullWidth
            label="Enter Company Name"
            variant="outlined"
            value={companyName}
            onChange={handleInputChange}
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            fullWidth
          >
            Get Info
          </Button>
        </Box>
        {loading ? (
          <Lottie options={defaultOptions} height={400} width={400} />
        ) : // <p>Check</p>
        isCompanyValid ? (
          data && (
            <Grid container spacing={2} style={{ marginTop: "20px" }}>
              <Grid item xs={1}></Grid>
              <Grid item xs={10}>
                <TableContainer component={Paper}>
                  <Table aria-label="simple table">
                    <TableHead>
                      <TableRow>
                        <StyledTableCell>Question</StyledTableCell>
                        <StyledTableCell align="center">Answer</StyledTableCell>
                        <StyledTableCell align="center">
                          Explanation
                        </StyledTableCell>
                        <StyledTableCell align="center">Proof</StyledTableCell>
                        <StyledTableCell align="center">
                          Specific detail
                        </StyledTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.questions.map((row) => (
                        <StyledTableRow key={row.id}>
                          <StyledTableCell component="th" scope="row">
                            {row.question}
                          </StyledTableCell>
                          <StyledTableCell align="left">
                            {row.answer}
                          </StyledTableCell>
                          <StyledTableCell align="left">
                            {row.explanation}
                          </StyledTableCell>
                          <StyledTableCell align="left">
                            {row.proof.includes("https") ? (
                              <a
                                href={row.proof}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Link
                              </a>
                            ) : (
                              <span style={{ color: "red" }}>{row.proof}</span>
                            )}
                          </StyledTableCell>
                          <StyledTableCell align="left">
                            {row.lineNumber || (
                              <span style={{ color: "red" }}>
                                There is a high possibility that the link to the
                                source was not fetched properly.
                              </span>
                            )}
                          </StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={1}></Grid>
            </Grid>
          )
        ) : (
          <h3>
            This is not a valid company. Please enter a valid company name!
          </h3>
        )}
      </Box>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        theme="dark"
        hideProgressBar={false}
      />
    </>
  );
};

export default App;
