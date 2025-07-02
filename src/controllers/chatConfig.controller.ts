import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { getPresignedUrl, uploadImageToS3 } from "../aws/imageUtils";
import multer from "multer";

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
        if (config && config.ChatBotLogoImage) {
            config.ChatBotLogoImage = await getPresignedUrl(config.ChatBotLogoImage);
        }

        res.status(200).json({ code: 200, data: config, message: "Success" });
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
            let ChatBotLogoImageURL : string | null = null;
            if(req.file){
                ChatBotLogoImageURL = await uploadImageToS3(req.file);
            }

            let ChatBotLogoImage;
            if (ChatBotLogoImageURL) {
                // ChatBotLogoImage = await getPresignedUrl(ChatBotLogoImageURL);
                ChatBotLogoImage = ChatBotLogoImageURL;
            }
            console.log("ChatBotLogoImage",ChatBotLogoImage)
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
                ChatBotLogoImage: ChatBotLogoImage,
                socketServer: process.env.SERVER_URL,
            };

            const existingConfig = await prisma.chatConfig.findFirst({where:{orgId:configData.orgId}});
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
        const {orgeId} = req.params
        const config = await prisma.chatConfig.findFirst({where:{orgId:orgeId}});

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

