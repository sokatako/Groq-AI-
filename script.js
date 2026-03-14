document.addEventListener("DOMContentLoaded", () => {
    // --- DOM 元素 ---
    const appLayout = document.getElementById("app-layout");
    const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
    const chatbox = document.getElementById("chatbox");
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const historyList = document.getElementById("history-list");
    const newChatBtn = document.getElementById("new-chat-btn");
    const chatTitle = document.getElementById("chat-title");
    const modelSelector = document.getElementById("model-selector");
    const darkBtn = document.getElementById("dark-btn");
    const lightBtn = document.getElementById("light-btn");
    const exportBtn = document.getElementById("export-btn");
    const importFileInput = document.getElementById("import-file-input");
    const scrollToBottomBtn = document.getElementById("scroll-to-bottom-btn");
    const fileUploadInput = document.getElementById("file-upload-input");
    const filePreviewContainer = document.getElementById("file-preview-container");

    // --- 狀態管理 ---
    let allChats = [];
    let currentChatId = null;
    let currentHistory = [];
    let selectedModel = 'llama3-8b-8192';
    let pendingFile = null;

    // --- 函數 ---
    const saveSidebarState = (isCollapsed) => localStorage.setItem('sidebarCollapsed', isCollapsed);
    const loadSidebarState = () => { if (localStorage.getItem('sidebarCollapsed') === 'true') appLayout.classList.add('sidebar-collapsed'); };
    const saveModelSelection = () => localStorage.setItem('selectedModel', selectedModel);
    const loadModelSelection = () => {
        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) { selectedModel = savedModel; modelSelector.value = savedModel; }
    };
    const saveChats = () => localStorage.setItem("allChats", JSON.stringify(allChats));
    const loadChats = () => {
        const savedChats = localStorage.getItem("allChats");
        if (savedChats) {
            allChats = JSON.parse(savedChats);
            if (allChats.length > 0) {
                currentChatId = allChats[allChats.length - 1].id;
                loadChatIntoView(currentChatId);
            }
        }
        renderHistoryList();
    };

    const renderHistoryList = () => {
        historyList.innerHTML = "";
        [...allChats].reverse().forEach(chat => {
            const item = document.createElement("div"); item.className = "history-item"; item.dataset.id = chat.id;
            // 使用 toString() 確保比較時型別一致
            if (currentChatId && chat.id.toString() === currentChatId.toString()) {
                item.classList.add("active");
            }
            const titleSpan = document.createElement("span"); titleSpan.className = "history-item-title"; titleSpan.textContent = chat.title; titleSpan.title = chat.title;
            const deleteBtn = document.createElement("button"); deleteBtn.className = "delete-chat-btn"; deleteBtn.innerHTML = "🗑️"; deleteBtn.dataset.id = chat.id; deleteBtn.title = "刪除此對話";
            item.appendChild(titleSpan); item.appendChild(deleteBtn);
            historyList.appendChild(item);
        });
    };

    const loadChatIntoView = (chatId) => {
        // 使用 toString() 進行比較，處理數字和字串兩種可能
        const chat = allChats.find(c => c.id.toString() === chatId.toString());
        if (!chat) { createNewChat(); return; }
        currentChatId = chatId; currentHistory = chat.messages; chatTitle.textContent = chat.title;
        chatbox.innerHTML = "";
        currentHistory.forEach(msg => {
            const userText = msg.role === 'user' ? (msg.originalText !== undefined ? msg.originalText : msg.content) : msg.content;
            appendMessage(msg.role === 'user' ? '你' : 'AI', userText, msg.role, msg.attachment);
        });
        chatbox.scrollTop = chatbox.scrollHeight;
        renderHistoryList();
    };

    const createNewChat = () => {
        currentChatId = null; currentHistory = []; chatbox.innerHTML = "";
        chatTitle.textContent = "🧠 新的聊天"; userInput.value = ""; userInput.style.height = 'auto';
        userInput.focus(); removePendingFile();
        appendMessage("AI", "新的對話已開始，有什麼我可以協助你的嗎？", "bot");
        renderHistoryList();
    };

    const handleFileSelection = (event) => {
        const file = event.target.files[0]; if (!file) return;
        const textTypes = ['text/plain', 'text/markdown', 'text/javascript', 'text/css', 'text/html', 'application/json', 'text/csv'];
        const isTextFile = textTypes.includes(file.type) || ['.py', '.js', '.css', '.html', '.md', '.txt', '.json', '.csv'].some(ext => file.name.endsWith(ext));
        const isImageFile = file.type.startsWith('image/');
        const reader = new FileReader();
        reader.onload = (e) => {
            pendingFile = { name: file.name, type: file.type, content: e.target.result, isText: isTextFile, isImage: isImageFile };
            displayFilePreview(file.name, isImageFile);
        };
        if (isTextFile) { reader.readAsText(file); } 
        else if (isImageFile) { reader.readAsDataURL(file); } 
        else { alert(`不支援的檔案類型：${file.type || '未知'}`); pendingFile = null; fileUploadInput.value = ''; }
    };

    const displayFilePreview = (fileName, isImage) => {
        const icon = isImage ? '🖼️' : '📄';
        filePreviewContainer.innerHTML = `<span class="file-icon">${icon}</span><span class="file-info" title="${fileName}">${fileName}</span><button class="remove-file-btn" title="移除檔案">×</button>`;
        filePreviewContainer.style.display = 'flex';
        filePreviewContainer.querySelector('.remove-file-btn').addEventListener('click', removePendingFile);
    };

    const removePendingFile = () => {
        pendingFile = null; fileUploadInput.value = ''; filePreviewContainer.style.display = 'none'; filePreviewContainer.innerHTML = '';
    };

    const appendMessage = (name, text, role, attachment = null) => {
        const msg = document.createElement("div"); msg.className = `message ${role}`;
        let contentHTML = `<strong>${name}：</strong>`;
        if (role === 'bot') {
            if (text) { updateBotMessage(msg, text, false); } else { msg.innerHTML = contentHTML + `<span class="typing-indicator"><span></span><span></span><span></span></span>`; }
        } else {
            contentHTML += text.replace(/\n/g, '<br>');
            msg.innerHTML = contentHTML;
        }
        if (attachment) {
            let attachmentHTML = '<div class="message-attachment">';
            if (attachment.isImage) { attachmentHTML += `<img src="${attachment.content}" alt="${attachment.name}">`; } 
            else { attachmentHTML += `<div class="file-display"><span class="file-icon">📄</span> ${attachment.name}</div>`; }
            attachmentHTML += '</div>';
            msg.innerHTML += attachmentHTML;
        }
        chatbox.appendChild(msg); chatbox.scrollTop = chatbox.scrollHeight; return msg;
    };

    const updateBotMessage = (messageElement, fullText, isStreaming = false) => {
        const cursor = isStreaming ? ' ▌' : '';
        const renderedHtml = marked.parse(fullText + cursor);
        messageElement.innerHTML = `<strong>AI：</strong>${renderedHtml}`;
        chatbox.scrollTop = chatbox.scrollHeight;
    };

    const streamGroq = async (prompt, messageElement) => {
        const apiMessages = currentHistory.map(({ role, content }) => ({ role, content }));
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
                body: JSON.stringify({ model: selectedModel, messages: apiMessages, stream: true })
            });
            if (!res.ok) { 
                const errorBody = await res.json();
                console.error("API Error:", errorBody);
                updateBotMessage(messageElement, `⚠️ 錯誤：${res.status} ${res.statusText}\n<pre>${JSON.stringify(errorBody, null, 2)}</pre>`);
                return; 
            }
            const reader = res.body.getReader(); const decoder = new TextDecoder("utf-8"); let answer = "";
            while (true) {
                const { value, done } = await reader.read(); if (done) break;
                const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split("\n");
                for (const line of lines) {
                    if (!line.trim().startsWith("data:")) continue;
                    const data = line.replace("data: ", "").trim();
                    if (data === "[DONE]") {
                        updateBotMessage(messageElement, answer);
                        currentHistory.push({ role: "assistant", content: answer });
                        const chat = allChats.find(c => c.id.toString() === currentChatId.toString());
                        if (chat) { chat.messages = [...currentHistory]; }
                        saveChats(); return;
                    }
                    try {
                        const json = JSON.parse(data); const delta = json.choices?.[0]?.delta?.content || "";
                        if (delta) { answer += delta; updateBotMessage(messageElement, answer, true); }
                    } catch (err) {}
                }
            }
        } catch (err) { console.error("串流錯誤：", err); updateBotMessage(messageElement, "⚠️ 客戶端發生錯誤，請檢查網路或程式碼。"); }
    };
    
    const handleDeleteChat = (chatIdToDelete) => {
        // 使用 toString() 比較，確保無論原始型別為何都能正確刪除
        allChats = allChats.filter(chat => chat.id.toString() !== chatIdToDelete.toString());
        saveChats();
        // 同樣使用 toString() 比較當前 ID
        if (currentChatId && currentChatId.toString() === chatIdToDelete.toString()) {
            if (allChats.length > 0) {
                loadChatIntoView(allChats[allChats.length - 1].id);
            } else {
                createNewChat();
            }
        } else {
            renderHistoryList();
        }
    };

    const handleExportChats = () => {
        if (allChats.length === 0) { alert("沒有對話紀錄可以匯出。"); return; }
        const blob = new Blob([JSON.stringify(allChats, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; const timestamp = new Date().toISOString().slice(0, 10);
        a.download = `chat-history-${timestamp}.json`; document.body.appendChild(a);
        a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const handleImportChats = (event) => {
        const file = event.target.files[0]; if (!file) return;
        if (!confirm("匯入將會覆蓋目前的對話紀錄，確定要繼續嗎？")) { event.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData) && (importedData.length === 0 || (importedData[0].id && importedData[0].title && importedData[0].messages))) {
                    allChats = importedData; saveChats(); alert("對話紀錄已成功匯入！");
                    if (allChats.length > 0) { loadChatIntoView(allChats[allChats.length - 1].id); } else { createNewChat(); }
                } else { throw new Error("檔案格式不符。"); }
            } catch (error) { alert(`匯入失敗：${error.message}`); } finally { event.target.value = ''; }
        };
        reader.readAsText(file);
    };

    const adjustTextareaHeight = () => { userInput.style.height = 'auto'; userInput.style.height = (userInput.scrollHeight) + 'px'; };

    // --- 事件監聽器 ---
    sidebarToggleBtn.addEventListener('click', () => { appLayout.classList.toggle('sidebar-collapsed'); saveSidebarState(appLayout.classList.contains('sidebar-collapsed')); });
    modelSelector.addEventListener('change', (e) => { selectedModel = e.target.value; saveModelSelection(); });

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        const userText = userInput.value.trim();
        const fileAttachment = pendingFile;
        if (!userText && !fileAttachment) return;
        
        let finalPrompt = userText;
        if (fileAttachment) {
            if (fileAttachment.isText) { finalPrompt = `基於檔案 "${fileAttachment.name}":\n\n\`\`\`\n${fileAttachment.content}\n\`\`\`\n\n我的問題是：\n${userText || '(請分析或總結以上檔案內容)'}`; } 
            else if (fileAttachment.isImage) { finalPrompt = `${userText} [使用者上傳了圖片: ${fileAttachment.name}]`; }
        }

        const userMsgObj = { role: "user", content: finalPrompt, originalText: userText, attachment: fileAttachment };
        
        if (currentChatId === null) {
            // FIX: 統一將新 ID 建立為字串
            currentChatId = Date.now().toString();
            const title = userText.substring(0, 20) || fileAttachment.name;
            currentHistory = [];
            allChats.push({ id: currentChatId, title: title, messages: currentHistory });
            chatTitle.textContent = title;
            renderHistoryList();
        }
        
        currentHistory.push(userMsgObj);
        appendMessage("你", userText, "user", fileAttachment);
        
        userInput.value = ""; removePendingFile(); adjustTextareaHeight();
        const messageElement = appendMessage("AI", "", "bot");
        await streamGroq(finalPrompt, messageElement);
    });

    userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatForm.dispatchEvent(new Event('submit')); } });
    userInput.addEventListener('input', adjustTextareaHeight);
    newChatBtn.addEventListener("click", createNewChat);

    historyList.addEventListener("click", (e) => {
        const target = e.target;
        const deleteBtn = target.closest('.delete-chat-btn');
        const item = target.closest('.history-item');

        if (deleteBtn) {
            e.stopPropagation();
            if (confirm("您確定要刪除這段對話嗎？")) {
                // FIX: 直接使用 dataset.id (字串)，不需轉換
                handleDeleteChat(deleteBtn.dataset.id);
            }
            return;
        }
        
        if (item && !item.querySelector('.edit-title-input')) {
            const chatId = item.dataset.id;
            // FIX: 比較前也轉換為字串確保一致
            if (!currentChatId || chatId.toString() !== currentChatId.toString()) {
                loadChatIntoView(chatId);
            }
        }
    });

    historyList.addEventListener('dblclick', (e) => {
        const titleSpan = e.target.closest('.history-item-title'); if (!titleSpan) return;
        const item = titleSpan.closest('.history-item');
        // FIX: 直接使用 dataset.id (字串)
        const chatId = item.dataset.id;
        const originalTitle = titleSpan.textContent; const input = document.createElement('input');
        input.type = 'text'; input.className = 'edit-title-input'; input.value = originalTitle;
        titleSpan.replaceWith(input); input.focus(); input.select();
        const saveOrCancel = (save) => {
            let newTitle = input.value.trim(); if (!save || newTitle === "") newTitle = originalTitle;
            // FIX: 比較前轉換為字串
            const chat = allChats.find(c => c.id.toString() === chatId.toString());
            if (chat && chat.title !== newTitle) { chat.title = newTitle; saveChats(); if (currentChatId && currentChatId.toString() === chatId.toString()) chatTitle.textContent = newTitle; }
            renderHistoryList(); // 直接呼叫 renderHistoryList 恢復顯示
        };
        input.addEventListener('blur', () => saveOrCancel(true));
        input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); saveOrCancel(true); } else if (event.key === 'Escape') { saveOrCancel(false); } });
    });

    darkBtn.addEventListener("click", () => { document.body.className = "dark"; darkBtn.classList.add("active"); lightBtn.classList.remove("active"); });
    lightBtn.addEventListener("click", () => { document.body.className = "light"; lightBtn.classList.add("active"); darkBtn.classList.remove("active"); });
    exportBtn.addEventListener("click", handleExportChats);
    importFileInput.addEventListener("change", handleImportChats);
    document.querySelector('.attach-btn').addEventListener('click', () => fileUploadInput.click());

    chatbox.addEventListener('scroll', () => {
        if (chatbox.scrollHeight - chatbox.scrollTop > chatbox.clientHeight + 100) { scrollToBottomBtn.classList.add('visible'); } 
        else { scrollToBottomBtn.classList.remove('visible'); }
    });
    scrollToBottomBtn.addEventListener('click', () => chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: 'smooth' }));

    // --- 程式初始化 ---
    loadSidebarState(); loadModelSelection(); loadChats();
    if (!currentChatId && allChats.length === 0) { createNewChat(); }
    adjustTextareaHeight();
});