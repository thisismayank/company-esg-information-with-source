const PPLX_KEY = process.env.PPLX_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GPT_KEY = process.env.GPT_KEY;
const BRAND_API_KEY = process.env.BRAND_API_KEY;
import BaseClass from "./base.class.js";
import OpenAI from "openai";

import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import response from "../lib/response.js";
import logger from "../lib/logger";
import sdk from "@api/pplx";
const promptTemplate = `The user will give you the name of the company and the output should be answers to the following three questions:            
  1. Does the company have a human rights policy?             
  2. Does the company provide human rights/esg training to employees?             
  3. Does the company track scope 1 emissions? Also provide the sources. The sources you provide should be active.             Any dead link or links that give 404, 500 error should not be returned.              
  The answer must be structured as an array of objects (which can be parsed into a JSON later) like this:              
  {               
    id:1,               
    question: "Does the company track scope 1 emissions?",              
  answer: "Yes",              
  explanation: "Explanation of why the answer is yes."              
  proof: "Link to the source or quotation proving this true.",             
  lineNumber: "specific page or line number in the source of truth" 
}`;

// const customPromptTemplate = `The user will give you the name of the company and the output should be answers to the following three questions:            1. ${question}  Also provide the sources. The sources you provide should be active.             Any dead link or links that give 404, 500 error should not be returned.              The answer should be structured as an array of objects (which can be parsed into a JSON later) like this:              {               id:1,               question: "Does the company track scope 1 emissions?",              answer: "Yes",              explanation: "Explanation of why the answer is yes."              proof: "Link to the source or quotation proving this true.",             lineNumber: "specific page or line number in the source of truth" }`;
export default class EsgerClass extends BaseClass {
  async brandLogoAndAuthChecker(brandName, socket) {
    try {
      console.log("brandLogoAndAuthChecker", brandName);

      const responseObj = await axios.get(
        `https://api.api-ninjas.com/v1/logo?name=${brandName}`,
        {
          headers: {
            "X-Api-Key": BRAND_API_KEY,
          },
        }
      );

      console.log("responseObj", responseObj.data[0]);
      const companyLogoAndValidity = responseObj.data[0];

      if (!companyLogoAndValidity) {
        return {
          ...response.ESGER.TEST.FAILURE,
          messageObj: "Company is invalid",
        };
      }
      try {
        socket.emit("update", "Company name validated!");
      } catch (error) {
        logger.error("ERROR: SOCKET ERROR - ${error");
      }
      const responseFinal = await this.factCheckerUsingPerplexity(
        brandName,
        companyLogoAndValidity,
        socket
      );
      return responseFinal;
      // {
      //   name: 'Tesla',
      //   ticker: 'TSLA',
      //   image: 'https://api-ninjas-data.s3.us-west-2.amazonaws.com/logos/lefd12553d6a4f7e57b3ac4f4927181d7a651d0d6.png'
      // }
      // return data;
    } catch (error) {
      logger.error("Error: Check for brand logo", error);
      try {
        socket.emit("error", "Something major broke! Try Again");
      } catch (error) {
        logger.error("ERROR: SOCKET ERROR - ${error");
      }
      throw error;
    }
  }
  async factCheckerUsingAnthropic(questionHere, company, socket) {
    try {
      console.log("FACT CHECKER", questionHere, company);

      const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
      });
      try {
        socket.emit("modelProcessing", "We are now checking with Claude!");
      } catch (error) {
        logger.error("ERROR: SOCKET ERROR - ${error");
      }
      let msg = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        temperature: 0,
        system: `The user will give you the name of the company and the output should be answers to the following three questions: 
        1. ${questionHere} Also provide the sources. The sources you provide should be active. Any dead link or links that give 404, 500 error should not be returned. 
        The answer should be structured as an array of objects (which can be parsed into a JSON later) like this: 
        { id:1, question: "Does the company track scope 1 emissions?", answer: "Yes", explanation: "Explanation of why the answer is yes.", proof: "Link to the source or quotation proving this true.", lineNumber: "specific page or line number in the source of truth" }
        The response should only contain the array of objects so I can parse it into JSON.
        Please provide answers to these questions about ${company}, ensuring that any sources provided are from reputable and reliable databases or publications. Avoid using sources that are not widely recognized for factual reporting. `,
        messages: [
          {
            role: "user",
            content: company,
          },
        ],
      });
      const dataThere = msg.content[0].text;
      console.log("MESSAGES", dataThere);
      const parsedData = JSON.parse(dataThere);

      console.log("parsedData", parsedData);
      const isLinkActive = await this.checkLink(parsedData[0].proof);
      if (!isLinkActive) {
        try {
          socket.emit(
            "update",
            "We'll try validating proof with another model!"
          );
        } catch (error) {
          logger.error("ERROR: SOCKET ERROR - ${error");
        }
        const data = await this.factCheckerUsingOpenAI(
          questionHere,
          company,
          socket
        ); // Ensure that 'question' is defined or passed correctly
        return data;
      }
      return { ...parsedData, isLinkActive };
    } catch (error) {
      console.log("error", error);
    }
  }

  async factCheckerUsingOpenAI(questionGpt, company, socket) {
    try {
      logger.info(
        `INFO: OpenAIClass-factCheckerUsingOpenAI - Prompt: ${questionGpt} - Company: ${company}`
      );
      const openai = new OpenAI({
        apiKey: GPT_KEY,
      });

      try {
        socket.emit("modelProcessing", "We will finally check with GPT-4!");
      } catch (error) {
        logger.error("ERROR: SOCKET ERROR - ${error");
      }
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `The user will ask questions about a specific company. Your task is to provide accurate and up-to-date answers. Focus on using sources that are current and from highly credible, actively maintained websites such as official company sites, reputable news organizations, and recognized government databases. Please ensure that all links to sources are active and were verified as published after 2020. It's crucial that these links do not return errors like 404 or 500. Structure your responses as an array of objects suitable for JSON parsing, detailing the question asked, your answer, an explanation, the source of the information, and the specific page or line number where this information can be verified.
            The output should be answers to the following three questions:            
  1. Does the company have a human rights policy?             
  2. Does the company provide human rights/esg training to employees?             
  3. Does the company track scope 1 emissions? 
  When providing information, please include citations based on your training data. For each piece of information, provide a reference to a type of source where such information might typically be found, such as academic journals, books, reputable websites, or official reports. Remember to format the citations in a standard referencing style.
  The answer must be structured as an array of objects (which can be parsed into a JSON later) like this:              
  {               
    id:1,               
    question: "Does the company track scope 1 emissions?",              
  answer: "Yes",              
  explanation: "Explanation of why the answer is yes. When providing information, please cite any sources or data you are referencing, based on your training data."              
  proof: "Link to the source or quotation proving this true. When providing information, please cite any sources or data you are referencing, based on your training data.",             
  lineNumber: "specific page or line number in the source of truth" 
}`,
          },
          { role: "user", content: company },
        ],
        model: "gpt-4-turbo",
        max_tokens: 1000,
      });

      logger.debug(
        `RESULT: OpenAIClass-factCheckerUsingOpenAI - RESPONSES: ${completion.choices[0].message.content}`
      );

      const parsedData = JSON.parse(completion.choices[0].message.content);
      console.log("PARSED GPT", parsedData);
      // return await this.checkInfo(parsedData, companyName);
      const isLinkActive = await this.checkLink(parsedData[0].proof, socket);

      return { ...parsedData, isLinkActive };
    } catch (error) {
      console.log(
        "Error generating text:",
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  }

  async factCheckerUsingPerplexity(
    companyName,
    companyLogoAndValidity,
    socket
  ) {
    try {
      logger.info(
        `Starting fact check with PPLX for: ${companyName} - companyLogoAndValidity: ${companyLogoAndValidity}`
      );
      sdk.auth(PPLX_KEY);
      const data = await sdk.post_chat_completions({
        model: "mixtral-8x7b-instruct",
        messages: [
          {
            role: "system",
            content: `  The user will ask questions about a specific company. Your task is to provide accurate and up-to-date answers. Focus on using sources that are current and from highly credible, actively maintained websites such as official company sites, reputable news organizations, and recognized government databases. Please ensure that all links to sources are active and were verified as published after 2020. It's crucial that these links do not return errors like 404 or 500. Structure your responses as an array of objects suitable for JSON parsing, detailing the question asked, your answer, an explanation, the source of the information, and the specific page or line number where this information can be verified.
            The output should be answers to the following three questions:            
  1. Does the company have a human rights policy?             
  2. Does the company provide human rights/esg training to employees?             
  3. Does the company track scope 1 emissions? 
  When providing information, please include citations based on your training data. For each piece of information, provide a reference to a type of source where such information might typically be found, such as academic journals, books, reputable websites, or official reports. Remember to format the citations in a standard referencing style.
  The answer must be structured as an array of objects (which can be parsed into a JSON later) like this:              
  {               
    id:<NUMBER which increments with each response i.e. 1 for the first, 2 for the second, 3 for the third and so on and so forth>,               
    question: "Does the company track scope 1 emissions?",              
  answer: "Yes",              
  explanation: "Explanation of why the answer is yes. When providing information, please cite any sources or data you are referencing, based on your training data."              
  proof: "Link to the source or quotation proving this true. When providing information, please cite any sources or data you are referencing, based on your training data.",             
  lineNumber: "specific page or line number in the source of truth" 
}`,
          },
          {
            role: "user",
            content: `For ${companyName}`,
          },
        ],
      });
      // console.log("data", JSON.parse(data));
      // console.log("data", data);
      console.log("PERPLEXITY data", data.data.choices[0].message.content);
      let parsedData = null;
      try {
        console.log(JSON.parse(data.data.choices[0].message.content));
        parsedData = JSON.parse(data.data.choices[0].message.content);
      } catch (error) {
        logger.error("ERROR: Perplexity screwed up in formatting", error);
      }
      if (!parsedData) {
        try {
          socket.emit(
            "update",
            "Looks like it might take a little longer! Hold on!"
          );
        } catch (error) {
          logger.error("ERROR: SOCKET ERROR - ${error");
        }
        try {
          const openai = new OpenAI({
            apiKey: GPT_KEY,
          });

          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `The user will give you some data. Please convert the data into a format which can be parsed into a JSON using JSON.parse() method. The response should only contain the same data as originally provided and no other words.`,
              },
              { role: "user", content: data.data.choices[0].message.content },
            ],
            model: "gpt-4-turbo",
            max_tokens: 1000,
          });

          console.log(
            "GPT CONVERSION TO BE PARSED DATA",
            JSON.parse(completion.choices[0].message.content)
          );

          parsedData = JSON.parse(completion.choices[0].message.content);
          // console.log("data", data.res);
          // console.log("data", data.res.body);
        } catch (error) {
          logger.error("ERROR: GPT ERROR", error);
          console.log("GPT errro", error);
          throw error;
        }
      }
      try {
        socket.emit("update", "Answer to the questions fetched successfully!");
      } catch (error) {
        logger.error("ERROR: SOCKET ERROR - ${error");
      }
      return await this.checkInfo(
        parsedData,
        companyName,
        companyLogoAndValidity,
        socket
      );
    } catch (error) {
      logger.error("ERROR: PPLX API error", error);
      throw error;
    }
  }

  async checkInfo(questionResponses, company, companyLogoAndValidity, socket) {
    let finalResponse = [];
    let index = 1;
    for (let questionResponse of questionResponses) {
      const isLinkActive = await this.checkLink(questionResponse.proof, socket);
      if (!isLinkActive) {
        try {
          socket.emit("update", "Couldn't validate, on to the next model!");
        } catch (error) {
          logger.error("ERROR: SOCKET ERROR - ${error");
        }
        questionResponse = await this.factCheckerUsingAnthropic(
          questionResponse.question,
          company,
          socket
        );
      }

      if (questionResponse.id) {
        questionResponse.id = index;
        finalResponse.push(questionResponse);
      } else if (questionResponse[0].id) {
        questionResponse[0].id = index;
        finalResponse.push(questionResponse[0]);
      }
      index = index + 1;
    }

    return {
      ...response.ESGER.TEST.SUCCESS,
      results: finalResponse,
      // results: questionResponses,
      companyLogoAndValidity,
    };
  }

  async checkLink(url, socket) {
    try {
      console.log("LINK", url);
      try {
        socket.emit("update", "Validating source of information!");
      } catch (error) {
        logger.error("ERROR: SOCKET ERROR - ${error");
      }
      const response = await axios.head(url, {
        timeout: 5000, // Timeout after 5000 ms (5 seconds)
      });
      console.log("response", response);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      logger.error(`Error checking the link ${url}:`, error);
      return false;
    }
  }
}
