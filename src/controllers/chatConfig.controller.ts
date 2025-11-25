import { PrismaClient, EndedByType } from "@prisma/client";
import { Request, Response } from "express";
import { getPresignedUrl, uploadImageToS3 } from "../aws/imageUtils";
import multer from "multer";
import { sendChatTranscriptEmail } from "../utils/email.utils"
import { createChatSummaryFunction } from "./chatSummary.controller";
import { crawlForPersonalData } from "../utils/chat-widget-crawler";

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() }).single("ChatBotLogoImage");

export const getChatConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const orgId = (req.query.orgId) as string;
    const config = await prisma.chatConfig.findFirst({
      where: {
        orgId: orgId
      }
    });

    const orgData = await prisma.organization.findFirst({
      where: { id: orgId },
      include: { faqs: true, dynamicData: true }
    });

    if (config && config.ChatBotLogoImage) {
      config.ChatBotLogoImage = await getPresignedUrl(config.ChatBotLogoImage);
    }

    res.status(200).json({ code: 200, data: { ...config, aiEnabled: orgData?.aiEnabled, faqs: orgData?.faqs, openAiKey: orgData?.openAiKey, dynamicData: orgData?.dynamicData }, message: "Success" });
  } catch (err) {
    console.error("Error fetching chat config:", err);
    res.status(500).json({ code: 500, message: "Internal Server Error" });
  }
};

export const updateChatConfig = async (req: Request, res: Response): Promise<any> => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ code: 400, message: "File upload failed", error: err });
    }
    try {
      const configData = req.body;
      delete configData.aiEnabled;
      delete configData.faqs;
      delete configData.dynamicData;

      let ChatBotLogoImageURL: string | null = null;
      if (req.file) {
        ChatBotLogoImageURL = await uploadImageToS3(req.file);
      }

      let ChatBotLogoImage;
      if (ChatBotLogoImageURL) {
        ChatBotLogoImage = ChatBotLogoImageURL;
      }
      const parseBoolean = (value: any) => value === "true" ? true : value === "false" ? false : value;
      const parseInteger = (value: any) => value ? parseInt(value, 10) : null;

      const parsedConfigData = {
        ...configData,
        allowEmojis: parseBoolean(configData.allowEmojis),
        allowFileUpload: parseBoolean(configData.allowFileUpload),
        allowNameEmail: parseBoolean(configData.allowNameEmail),
        allowCustomGreeting: parseBoolean(configData.allowCustomGreeting),
        availability: parseBoolean(configData.availability),
        allowFontFamily: parseBoolean(configData.allowFontFamily),
        aiOrgId: parseInteger(configData.aiOrgId),
        allowCustomRecycleClear:parseBoolean(configData.allowCustomRecycleClear),
        CustomRecycleClear:parseInteger(configData.CustomRecycleClear),
        customPersonalDetails:configData.customPersonalDetails,
        ChatBotLogoImage: ChatBotLogoImage,
        socketServer: process.env.SERVER_URL,
      };

      const existingConfig = await prisma.chatConfig.findFirst({ where: { orgId: configData.orgId } });
      let updatedConfig;

      if (existingConfig) {
        updatedConfig = await prisma.chatConfig.update({
          where: { id: existingConfig.id },
          data: parsedConfigData,
        });
      } else {
        updatedConfig = await prisma.chatConfig.create({
          data: parsedConfigData,
        });
      }
      res.status(200).json({ code: 200, data: updatedConfig, message: "Chat configuration updated successfully" });
    } catch (err) {
      console.error("Error updating chat config:", err);
      res.status(500).json({ code: 500, message: "Internal Server Error" });
    }
  });
};


export const getChatScript = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orgeId } = req.params
    const config = await prisma.chatConfig.findFirst({ where: { orgId: orgeId } });

    if (!config) {
      res.status(404).send("// Chat configuration not found");
      return;
    }

    const script = `
        <script src="${process.env.SERVER_URL}/socket.io/socket.io.js"></script>
        <script type="text/javascript">
            (function () {
                var socketScript = document.createElement("script");
                socketScript.src = "${process.env.SERVER_URL}/socket.io/socket.io.js";
                socketScript.async = true;
                socketScript.onload = function () {
                    var chatWidgetScript = document.createElement("script");
                    chatWidgetScript.src = "${process.env.SERVER_URL}/chat-widget.js"; 
                    chatWidgetScript.async = true;
                    chatWidgetScript.onload = function () {
                        if (typeof ChatWidget !== "undefined") {
                            ChatWidget.init({
                                elementId: "chat-widget",
                                orgId: "${config.orgId}",
                            });
                        }
                    };
                    document.body.appendChild(chatWidgetScript);
                };
                document.body.appendChild(socketScript);
            })();
            </script>
        <div id="chat-widget"></div>
        `;

    res.setHeader("Content-Type", "application/javascript");
    res.status(200).json({ code: 200, data: script, message: 'Script fetched successfully!' });
  } catch (err) {
    console.error("Error generating chat script:", err);
    res.status(500).send("Internal Server Error");
  }
};

export const endChat = async (req: any, res: any): Promise<void> => {
  try {
    const { thread_id, ended_by,url ,header} = req.body;

    if (!thread_id || !ended_by) {
      return res.status(400).json({ code: 400, message: 'Missing thread_id or ended_by' });
    }

    if (!Object.values(EndedByType).includes(ended_by)) {
      return res.status(400).json({ code: 400, message: 'Invalid ended_by value' });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: thread_id },
    });

    if (!thread) {
      return res.status(404).json({ code: 404, message: 'Thread not found' });
    }

    if (thread.status === 'ended') {
      res.clearCookie("chatWidgetThreadId", { path: '/' });
      return res.status(400).json({ code: 400, message: 'Chat is already ended' });
    }

    await prisma.thread.update({
      where: { id: thread_id },
      data: {
        status: 'ended',
        type:"completed",
        endedBy: ended_by,
        endedAt: new Date(),
      },
    });

    await createChatSummaryFunction(thread_id)

    // function to crawl the data 
    // if(url){
    //  const data =  await crawlForPersonalData(url,header)
    // }
    
    const messages = await prisma.message.findMany({
      where: { threadId: thread_id },
      orderBy: { createdAt: 'asc' },
    });

    const chatConfig = await prisma.chatConfig.findFirst({
      where: { aiOrgId: thread.aiOrgId },
      select: { emailConfig: true },
    });
    const organization = await prisma.organization.findFirst({
      where: { aiOrgId: thread.aiOrgId },
      select: { emailConfig: true },
    });

    const emailConfig = chatConfig?.emailConfig || organization?.emailConfig;

    if (thread.email && emailConfig) {
      try {
        await sendChatTranscriptEmail({
          threadId: thread.id,
          messages,
          email: thread.email,
          emailConfig,
        });
      } catch (emailError) {
        console.error('Failed to send chat transcript email:', emailError);
      }
    }


    return res.status(200).json({
      code: 200,
      message: 'Chat ended successfully',
    });

  } catch (err) {
    console.error('Error in endChat:', err);
    return res.status(500).json({ code: 500, message: 'Internal Server Error' });
  }
};

export const endChatFunction = async ({ thread_id, ended_by,pageUrl ,pageTitle,header,browserData}:{thread_id:string,ended_by:any,pageUrl:string|null,pageTitle:string|null,header:string|null,browserData:string[]|null})=> {
  try {
     

    if (!thread_id || !ended_by) {
      return false
    }

    if (!Object.values(EndedByType).includes(ended_by)) {
      return false
    }

    const thread = await prisma.thread.findUnique({
      where: { id: thread_id },
    });

    if (!thread) {
      return false
    }

    // if (thread.status === 'ended') {
    //   res.clearCookie("chatWidgetThreadId", { path: '/' });
    //   return true
    // }

    await prisma.thread.update({
      where: { id: thread_id },
      data: {
        status: 'ended',
        type:"completed",
        endedBy: ended_by,
        endedAt: new Date(),
      },
    });

    await createChatSummaryFunction(thread_id)

    // function to crawl the data 
    // if(url){
    //  const data =  await crawlForPersonalData(url,header)
    // }
    
    const messages = await prisma.message.findMany({
      where: { threadId: thread_id },
      orderBy: { createdAt: 'asc' },
    });

    const chatConfig = await prisma.chatConfig.findFirst({
      where: { aiOrgId: thread.aiOrgId },
      select: { emailConfig: true },
    });
    const organization = await prisma.organization.findFirst({
      where: { aiOrgId: thread.aiOrgId },
      select: { emailConfig: true },
    });

    const emailConfig = chatConfig?.emailConfig || organization?.emailConfig;

    if (thread.email && emailConfig) {
      try {
        await sendChatTranscriptEmail({
          threadId: thread.id,
          messages,
          email: thread.email,
          emailConfig,
        });
      } catch (emailError) {
        console.error('Failed to send chat transcript email:', emailError);
      }
    }
    return true

  } catch (err) {
    console.error('Error in endChat:', err);
    return err
  }
};

export const chatThreadEmailTranscript = async(req:Request,res:Response) : Promise<any> =>{
  try{
     const { thread_id,email,cc} = req.body;
    if (!thread_id ) {
      return res.status(400).json({ code: 400, message: 'Missing thread_id' });
    }
    const thread = await prisma.thread.findUnique({
      where: { id: thread_id },
    });
    if (!thread) {
      return res.status(404).json({ code: 404, message: 'Thread not found' });
    }
    const messages = await prisma.message.findMany({
      where: { threadId: thread_id },
      orderBy: { createdAt: 'asc' },
    });
    const chatConfig = await prisma.chatConfig.findFirst({
      where: { aiOrgId: thread.aiOrgId },
      select: { emailConfig: true },
    });
    const organization = await prisma.organization.findFirst({
      where: { aiOrgId: thread.aiOrgId },
      select: { emailConfig: true },
    });

    const emailConfig = chatConfig?.emailConfig || organization?.emailConfig;

    if (email && emailConfig) {
      try {
        await sendChatTranscriptEmail({
          threadId: thread.id,
          messages,
          email: email,
          emailConfig,
          cc
        });
        
      } catch (emailError) {
        console.error('Failed to send chat transcript email:', emailError);
      }
       return res.status(200).json({
      code: 200,
      message: 'chat transcribe send successfully',
    });
    }else{
      return res.status(400).json({
      code: 400,
      message: 'Email configuration not found',
    });
    }
  }catch(err:any){
    return res.status(500).json({ code: 500, message: 'Internal Server Error' })
  }

}

