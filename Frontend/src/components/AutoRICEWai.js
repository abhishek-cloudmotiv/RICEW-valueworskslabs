import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import { getIdToken } from '../utils/cognito-auth';
import { FunctionalResourceAutocomplete } from './Deliver Manager/Functional Specification/FunctionalSpecificationLOVlist';
import AutoRICEWFeedbackPopView from './AutoRICEWFeedbackPopView';

const AutoRICEWai = ({ selectedProject, onBackToLanding }) => {
    const { projectId, projectName, handleAuthError } = useSession();
    const [selectAll, setSelectAll] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resourceOptions, setResourceOptions] = useState([]);
    const [ownerData, setOwnerData] = useState({}); // { ricewName: { ownerName, ownerEmail, resourceId } }
    const [showAIBuildPopup, setShowAIBuildPopup] = useState(false);
    const [aiBuildStep, setAiBuildStep] = useState(1);
    const [aiBuildProgress, setAiBuildProgress] = useState(0);
    const [generatedRows, setGeneratedRows] = useState([]);
    const [savedTimestamps, setSavedTimestamps] = useState({});
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackRow, setFeedbackRow] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackSuccess, setFeedbackSuccess] = useState(false);
    const [customAlert, setCustomAlert] = useState({ show: false, message: '' });

    const handleFeedbackClick = (rowName) => {
        setFeedbackRow(rowName);
        setFeedbackText('');
        setFeedbackSuccess(false);
        setShowFeedbackModal(true);
    };

    const handleFeedbackSubmit = () => {
        console.log(`Submitted feedback for ${feedbackRow}:`, feedbackText);
        setFeedbackSuccess(true);
        setTimeout(() => {
            setShowFeedbackModal(false);
            setFeedbackRow(null);
            setFeedbackText('');
            setFeedbackSuccess(false);
        }, 1500);
    };

    const handleAIBuildClick = async () => {
        if (selectedRows.length === 0) return;

        // Show progress overlay immediately for smooth UX
        setAiBuildStep(1);
        setAiBuildProgress(5);
        setShowAIBuildPopup(true);

        try {
            const idToken = await getIdToken();
            if (!idToken) {
                if (handleAuthError) handleAuthError();
                return;
            }

            const currentProjectId = localStorage.getItem('project_id') || projectId || '101';
            const userId = localStorage.getItem('user_id') || 'system';

            // Post RICEW entries in parallel to the backend DynamoDB API
            const apiCalls = selectedRows.map(async (rowName) => {
                const row = ricewData.find(r => r.RICEW_Name === rowName);
                if (!row) return;

                let finalFileNames = uploadedFiles[rowName] || [];
                let finalFileUrls = uploadedFileUrls[rowName] || [];
                let finalStampedNames = uploadedFileStampedNames[rowName] || [];

                const localFiles = selectedLocalFiles[rowName] || [];
                const s3Keys = [];
                const skillsUsed = [];

                if (localFiles.length > 0) {
                    setUploadingState(prev => ({ ...prev, [rowName]: true }));
                    try {
                        const ricewId = row.RICEWRequestFormId || 'rice-id-1';

                        const pdfFiles = localFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
                        const excelFiles = localFiles.filter(f => {
                            const ext = f.name.toLowerCase().split('.').pop();
                            return ext === 'xlsx' || ext === 'xls';
                        });
                        const docxFiles = localFiles.filter(f => {
                            const ext = f.name.toLowerCase().split('.').pop();
                            return ext === 'docx' || ext === 'doc';
                        });
                        const txtFiles = localFiles.filter(f => f.name.toLowerCase().endsWith('.txt'));
                        const logFiles = localFiles.filter(f => f.name.toLowerCase().endsWith('.log'));
                        const imageFiles = localFiles.filter(f => {
                            const ext = f.name.toLowerCase().split('.').pop();
                            return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
                        });
                        const audioFiles = localFiles.filter(f => {
                            const ext = f.name.toLowerCase().split('.').pop();
                            return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
                        });

                        const conversionPromises = [];

                        const newUploadedNames = [];
                        const newUploadedUrls = [];
                        const newUploadedStampedNames = [];

                        if (logFiles.length > 0) {
                            const formData = new FormData();
                            formData.append('project_id', currentProjectId);
                            formData.append('user_id', userId);
                            formData.append('work_id', ricewId);
                            logFiles.forEach(f => formData.append('file', f));

                            const logPromise = fetch('https://feargjbojbauvs3fkwlt57kowq0qlerq.lambda-url.ap-south-1.on.aws/', {
                                method: 'POST',
                                body: formData
                            }).then(async res => {
                                if (!res.ok) throw new Error(`Log upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = logFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('log-to-markdown');
                                    }
                                }
                            });
                            conversionPromises.push(logPromise);
                        }

                        if (txtFiles.length > 0) {
                            const formData = new FormData();
                            formData.append('project_id', currentProjectId);
                            formData.append('user_id', userId);
                            formData.append('work_id', ricewId);
                            txtFiles.forEach(f => formData.append('file', f));

                            const txtPromise = fetch('https://vsayyxjppj7pa7hppudxt5bq3q0qahhb.lambda-url.ap-south-1.on.aws/', {
                                method: 'POST',
                                body: formData
                            }).then(async res => {
                                if (!res.ok) throw new Error(`Text upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = txtFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('txt-to-markdown');
                                    }
                                }
                            });
                            conversionPromises.push(txtPromise);
                        }

                        if (pdfFiles.length > 0) {
                            const formData = new FormData();
                            formData.append('project_id', currentProjectId);
                            formData.append('user_id', userId);
                            formData.append('work_id', ricewId);
                            pdfFiles.forEach(f => formData.append('file', f));

                            const pPromise = fetch('https://2llaac5nv3r6m4wyvdp2aasyqm0ukcsh.lambda-url.ap-south-1.on.aws/', {
                                method: 'POST',
                                body: formData
                            }).then(async res => {
                                if (!res.ok) throw new Error(`PDF upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = pdfFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('pdf-to-markdown');
                                    }
                                }
                            });
                            conversionPromises.push(pPromise);
                        }

                        if (excelFiles.length > 0) {
                            const formData = new FormData();
                            formData.append('project_id', currentProjectId);
                            formData.append('user_id', userId);
                            formData.append('work_id', ricewId);
                            excelFiles.forEach(f => formData.append('file', f));

                            const ePromise = fetch('https://k5bktm7u6i5yyqgtqcwaman6640vlbwg.lambda-url.ap-south-1.on.aws/', {
                                method: 'POST',
                                body: formData
                            }).then(async res => {
                                if (!res.ok) throw new Error(`Excel upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = excelFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('excel-to-markdown');
                                    }
                                }
                            });
                            conversionPromises.push(ePromise);
                        }

                        if (docxFiles.length > 0) {
                            const formData = new FormData();
                            formData.append('project_id', currentProjectId);
                            formData.append('user_id', userId);
                            formData.append('work_id', ricewId);
                            docxFiles.forEach(f => formData.append('file', f));

                            const dPromise = fetch('https://fhcrnjtslyexwcyg6xzpuqni7m0fjwcq.lambda-url.ap-south-1.on.aws/', {
                                method: 'POST',
                                body: formData
                            }).then(async res => {
                                if (!res.ok) throw new Error(`DOCX upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = docxFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('docx-to-markdown');
                                    }
                                }
                            });
                            conversionPromises.push(dPromise);
                        }

                        if (imageFiles.length > 0) {
                            const formData = new FormData();
                            formData.append('project_id', currentProjectId);
                            formData.append('user_id', userId);
                            formData.append('work_id', ricewId);
                            imageFiles.forEach(f => formData.append('file', f));

                            const imgPromise = fetch('https://2duujvdstq3biphfwlej7jnxji0jpmbg.lambda-url.ap-south-1.on.aws/', {
                                method: 'POST',
                                body: formData
                            }).then(async res => {
                                if (!res.ok) throw new Error(`Image upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = imageFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('image-to-markdown');
                                    }
                                }
                            });
                            conversionPromises.push(imgPromise);
                        }

                        if (audioFiles.length > 0) {
                            const audioDocs = audioFiles.map(file => {
                                const ext = file.name.split('.').pop().toLowerCase();
                                let mime = 'audio/mpeg';
                                if (ext === 'wav') mime = 'audio/wav';
                                else if (ext === 'ogg') mime = 'audio/ogg';
                                else if (ext === 'm4a') mime = 'audio/mp4';
                                return { name: file.name, type: mime };
                            });

                            const aPromise = (async () => {
                                const presignRes = await fetch('https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/md-file-auto-audio', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${idToken}`
                                    },
                                    body: JSON.stringify({
                                        user_id: userId,
                                        project_id: currentProjectId,
                                        documents: audioDocs
                                    })
                                });

                                if (!presignRes.ok) {
                                    throw new Error(`Failed to generate pre-signed URLs for audio: ${await presignRes.text()}`);
                                }

                                const presignData = await presignRes.json();
                                if (!presignData.success || !presignData.urls) {
                                    throw new Error("Invalid presigned URLs response for audio.");
                                }

                                const uploadedKeys = [];
                                await Promise.all(presignData.urls.map(async (urlMeta, idx) => {
                                    const file = audioFiles[idx];
                                    const uploadRes = await fetch(urlMeta.signedUrl, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': audioDocs[idx].type
                                        },
                                        body: file
                                    });
                                    if (!uploadRes.ok) {
                                        throw new Error(`S3 direct upload failed for audio ${file.name}`);
                                    }
                                    console.log(`Audio file uploaded to S3 successfully:`, urlMeta.publicCloudFrontUrl);
                                    const s3Key = urlMeta.s3Key || urlMeta.key || urlMeta.s3_key || urlMeta.publicCloudFrontUrl.replace('https://d1z1oiez6i3mzi.cloudfront.net/', '');
                                    uploadedKeys.push(s3Key);
                                }));

                                const res = await fetch('https://4rvtetdt5yrj3m6egatwie3ohi0esfcs.lambda-url.ap-south-1.on.aws/', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        project_id: currentProjectId,
                                        user_id: userId,
                                        s3_keys: uploadedKeys
                                    })
                                });

                                if (!res.ok) throw new Error(`Audio upload/conversion failed: ${res.statusText}`);
                                const data = await res.json();
                                if (data.success) {
                                    if (data.input_s3_keys && Array.isArray(data.input_s3_keys)) {
                                        data.input_s3_keys.forEach((key, idx) => {
                                            const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                                            const cfUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${cleanKey}`;
                                            const origName = audioFiles[idx]?.name || key.split('/').pop();
                                            newUploadedNames.push(origName);
                                            newUploadedUrls.push(cfUrl);
                                            newUploadedStampedNames.push(key);
                                        });
                                    }
                                    const outKey = data.cloudfront_url || data.output_s3_key || '';
                                    if (outKey) {
                                        s3Keys.push(outKey);
                                        skillsUsed.push('audio-to-markdown');
                                    }
                                }
                            })();
                            conversionPromises.push(aPromise);
                        }

                        await Promise.all(conversionPromises);

                        finalFileNames = [...finalFileNames, ...newUploadedNames];
                        finalFileUrls = [...finalFileUrls, ...newUploadedUrls];
                        finalStampedNames = [...finalStampedNames, ...newUploadedStampedNames];

                        setUploadedFiles(prev => ({
                            ...prev,
                            [rowName]: finalFileNames
                        }));
                        setUploadedFileUrls(prev => ({
                            ...prev,
                            [rowName]: finalFileUrls
                        }));
                        setUploadedFileStampedNames(prev => ({
                            ...prev,
                            [rowName]: finalStampedNames
                        }));

                        setSelectedLocalFiles(prev => {
                            const copy = { ...prev };
                            delete copy[rowName];
                            return copy;
                        });

                    } catch (uploadErr) {
                        console.error(`Error processing requirement file during AI Build for ${rowName}:`, uploadErr);
                        alert(`Error uploading file for ${rowName}: ${uploadErr.message}`);
                        return;
                    } finally {
                        setUploadingState(prev => ({ ...prev, [rowName]: false }));
                    }
                }

                // 1. Create the RICEW AI Master record first
                const reqFilesArray = [];
                finalFileNames.forEach((name, idx) => {
                    reqFilesArray.push({
                        file_name: name,
                        file_url: finalFileUrls[idx] || ''
                    });
                });

                const createPayload = {
                    who_columns: '',
                    Project_id: currentProjectId,
                    AI_build: 'true',
                    requirement_files: reqFilesArray,
                    RICEWRequestFormId: row.RICEWRequestFormId || '',
                    Client_Roster_Form_id: ownerData[rowName]?.resourceId || '',
                    Client_Roster_Name: ownerData[rowName]?.ownerName || '',
                    Client_Roster_Email: ownerData[rowName]?.ownerEmail || '',
                    RICEW_Name: row.RICEW_Name || '',
                    RICEW_Type: row.RICEW_Type || '',
                    RICEW_Status: row.RICEW_Status || '',
                    AI_Generated_File: [{
                        approved_document_fs: 'false',
                        fs_file_name: `FS_${row.RICEW_Name}.docx`,
                        fs_url: '',
                        ts_file_name: `TS_${row.RICEW_Name}.docx`,
                        ts_url: '',
                        code_file_name: `${row.RICEW_Name}.sql`,
                        code_url: '',
                        test_case_file_name: `Test_${row.RICEW_Name}.docx`,
                        test_case_url: '',
                        approved_document_ts: 'false',
                        approved_document_code: 'false',
                        approved_document_test_case: 'false'
                    }],
                    created_by: userId
                };

                const existingRecordId = savedRecordIds[rowName];
                if (existingRecordId) {
                    createPayload.append_to_id = existingRecordId;
                }

                const createResponse = await fetch('https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/ricew/autoRICEWAI/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(createPayload)
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    console.error(`Failed to create Auto RICEW AI record for ${rowName}:`, errorText);
                    return;
                }

                const createResult = await createResponse.json();
                const recordId = createResult.Auto_RICEW_AI_id;
                console.log(`Auto RICEW AI master record created/updated with ID ${recordId} for ${rowName}`);

                if (!recordId) {
                    console.error(`Invalid record ID returned for ${rowName}`);
                    return;
                }

                setSavedRecordIds(prev => ({
                    ...prev,
                    [rowName]: recordId
                }));

                // Call Claude Merger lambda to merge converted markdown files
                let mergedMarkdownUrl = '';

                if (s3Keys.length > 0) {
                    try {
                        console.log(`Calling Claude Merger for ${rowName}...`);
                        const mergerResponse = await fetch('https://lwfz5dxshfulhjm2akihctnvke0ictys.lambda-url.ap-south-1.on.aws/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                project_id: currentProjectId,
                                user_id: userId,
                                work_id: row.RICEWRequestFormId || 'rice-id-1',
                                s3_keys: s3Keys,
                                skills_used: skillsUsed
                            })
                        });

                        if (!mergerResponse.ok) {
                            throw new Error(`Claude Merger service failed: ${mergerResponse.statusText}`);
                        }

                        const mergerResult = await mergerResponse.json();
                        if (mergerResult.success && mergerResult.cloudfront_url) {
                            mergedMarkdownUrl = mergerResult.cloudfront_url;
                            console.log(`Claude Merger completed successfully:`, mergedMarkdownUrl);
                        } else {
                            throw new Error("Merger response missing cloudfront_url.");
                        }
                    } catch (mergerErr) {
                        console.error(`Error during Claude Merger:`, mergerErr);
                    }
                }

                // 2. Prepare file for the AI Lambda Functional Specification generation using the merged markdown cloudfront url
                let fsGeneratedUrl = '';
                let fsGeneratedFileName = `FS_${row.RICEW_Name}.docx`;

                if (mergedMarkdownUrl) {
                    try {
                        console.log(`Calling AI FS Lambda Generation service for ${rowName}...`);
                        setAiBuildStep(1);
                        setAiBuildProgress(12);

                        const aiBaseUrl = 'https://vzuaoqnbpxlplokt7kh2h2wl7e0goyeo.lambda-url.ap-south-1.on.aws/';
                        const aiUrl = `${aiBaseUrl}?project_id=${currentProjectId}&id=${userId}&work_id=${recordId}`;

                        const aiResponse = await fetch(aiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                file_url: mergedMarkdownUrl
                            })
                        });

                        if (!aiResponse.ok) {
                            throw new Error(`AI Lambda Generation service failed with status: ${aiResponse.status}`);
                        }

                        const aiResult = await aiResponse.json();
                        if (aiResult.status === 'success') {
                            const generatedDoc = aiResult.files?.docx;
                            const fileUrl = generatedDoc?.display_url || generatedDoc?.download_url;
                            if (generatedDoc && fileUrl) {
                                fsGeneratedFileName = generatedDoc.filename || fsGeneratedFileName;
                                fsGeneratedUrl = fileUrl;
                                console.log(`Functional Specification generated successfully via Lambda:`, fsGeneratedUrl);
                                setAiBuildStep(2);
                                setAiBuildProgress(25);
                            } else {
                                console.warn('AI Lambda response success, but missing docx.display_url or docx.download_url:', aiResult);
                            }
                        } else {
                            throw new Error(aiResult.message || 'AI Generation failed');
                        }
                    } catch (lambdaErr) {
                        console.error(`Error during AI Lambda Functional Specification generation for ${rowName}:`, lambdaErr);
                    }
                } else {
                    console.warn(`No merged requirement file available for ${rowName}. Skipping AI Lambda call.`);
                }

                // 3. Call AI TS Lambda Generation service using the output of the FS generation
                let tsGeneratedUrl = '';
                let tsGeneratedFileName = `TS_${row.RICEW_Name}.docx`;

                if (fsGeneratedUrl) {
                    try {
                        console.log(`Fetching generated Functional Specification file from ${fsGeneratedUrl}...`);
                        setAiBuildProgress(30);

                        const fsFileRes = await fetch(fsGeneratedUrl);
                        const fsBlob = await fsFileRes.blob();
                        const fsFile = new File([fsBlob], fsGeneratedFileName, { type: fsBlob.type });

                        console.log(`Calling AI TS Lambda Generation service for ${rowName}...`);
                        setAiBuildProgress(38);

                        const tsFormData = new FormData();
                        tsFormData.append('file', fsFile);

                        const tsBaseUrl = 'https://plnxwqrwx2y6hcbecnpv2zfkg40cgixi.lambda-url.ap-south-1.on.aws/';
                        const tsUrl = `${tsBaseUrl}?project_id=${currentProjectId}&id=${userId}&work_id=${recordId}`;

                        const tsResponse = await fetch(tsUrl, {
                            method: 'POST',
                            body: tsFormData
                        });

                        if (!tsResponse.ok) {
                            throw new Error(`TS Lambda Generation service failed with status: ${tsResponse.status}`);
                        }

                        const tsResult = await tsResponse.json();
                        if (tsResult.status === 'success' || tsResult.success) {
                            const tsDocxFile = tsResult.files?.docx;
                            const fileUrl = tsDocxFile?.display_url || tsDocxFile?.download_url;
                            if (tsDocxFile && fileUrl) {
                                tsGeneratedFileName = tsDocxFile.filename || tsGeneratedFileName;
                                tsGeneratedUrl = fileUrl;
                                console.log(`Technical Specification generated successfully via Lambda:`, tsGeneratedUrl);
                                setAiBuildStep(3);
                                setAiBuildProgress(50);
                            } else {
                                console.warn('TS Lambda response success, but missing docx.display_url or docx.download_url:', tsResult);
                            }
                        } else {
                            throw new Error(tsResult.message || 'TS Generation failed');
                        }
                    } catch (tsLambdaErr) {
                        console.error(`Error during AI Lambda Technical Specification generation for ${rowName}:`, tsLambdaErr);
                    }
                } else {
                    console.warn(`No FS URL found. Skipping AI TS Lambda call.`);
                }

                // 3.5 Call AI Code Lambda Generation service using the output of the TS generation
                let codeGeneratedUrl = '';
                let codeGeneratedFileName = `${row.RICEW_Name}.sql`;

                if (tsGeneratedUrl) {
                    try {
                        console.log(`Fetching generated Technical Specification file from ${tsGeneratedUrl}...`);
                        setAiBuildProgress(56);

                        const tsFileRes = await fetch(tsGeneratedUrl);
                        const tsBlob = await tsFileRes.blob();
                        const tsFile = new File([tsBlob], tsGeneratedFileName, { type: tsBlob.type });

                        console.log(`Calling AI Code Lambda Generation service for ${rowName}...`);
                        setAiBuildProgress(63);

                        const codeFormData = new FormData();
                        codeFormData.append('file', tsFile);
                        codeFormData.append('document', tsFile);

                        const codeBaseUrl = 'https://nv5vmxuikhzc6bcjtd3vszntw40gdrme.lambda-url.ap-south-1.on.aws/';
                        const codeUrl = `${codeBaseUrl}?project_id=${currentProjectId}&id=${userId}&work_id=${recordId}`;

                        const codeResponse = await fetch(codeUrl, {
                            method: 'POST',
                            body: codeFormData
                        });

                        if (!codeResponse.ok) {
                            throw new Error(`Code Lambda Generation service failed with status: ${codeResponse.status}`);
                        }

                        const codeResult = await codeResponse.json();
                        if (codeResult.status === 'success' || codeResult.success) {
                            const sqlFile = codeResult.files?.sql;
                            const fileUrl = sqlFile?.display_url || sqlFile?.download_url;
                            if (sqlFile && fileUrl) {
                                codeGeneratedFileName = sqlFile.filename || codeGeneratedFileName;
                                codeGeneratedUrl = fileUrl;
                                console.log(`Implementation Code generated successfully via Lambda:`, codeGeneratedUrl);
                                setAiBuildStep(4);
                                setAiBuildProgress(75);
                            } else {
                                console.warn('Code Lambda response success, but missing sql.display_url or sql.download_url:', codeResult);
                            }
                        } else {
                            throw new Error(codeResult.message || 'Code Generation failed');
                        }
                    } catch (codeLambdaErr) {
                        console.error(`Error during AI Lambda Code generation for ${rowName}:`, codeLambdaErr);
                    }
                } else {
                    console.warn(`No TS URL found. Skipping AI Code Lambda call.`);
                }

                // 3.7 Call AI Test Case Lambda Generation service using FS, TS, and Code outputs
                let testGeneratedUrl = '';
                let testGeneratedFileName = `Test_${row.RICEW_Name}.docx`;

                if (fsGeneratedUrl && tsGeneratedUrl && codeGeneratedUrl) {
                    try {
                        console.log(`Fetching generated files (FS, TS, Code) for Test Case generation for ${rowName}...`);
                        setAiBuildProgress(81);

                        // Download FS
                        const fsFileRes = await fetch(fsGeneratedUrl);
                        const fsBlob = await fsFileRes.blob();
                        const fsFile = new File([fsBlob], fsGeneratedFileName, { type: fsBlob.type });

                        // Download TS
                        const tsFileRes = await fetch(tsGeneratedUrl);
                        const tsBlob = await tsFileRes.blob();
                        const tsFile = new File([tsBlob], tsGeneratedFileName, { type: tsBlob.type });

                        // Download Code
                        const codeFileRes = await fetch(codeGeneratedUrl);
                        const codeBlob = await codeFileRes.blob();
                        const codeFile = new File([codeBlob], codeGeneratedFileName, { type: codeBlob.type });

                        console.log(`Calling AI Test Case Lambda Generation service for ${rowName}...`);
                        setAiBuildProgress(88);

                        const testFormData = new FormData();
                        testFormData.append('functional_spec', fsFile);
                        testFormData.append('technical_spec', tsFile);
                        testFormData.append('code_file', codeFile);

                        const testBaseUrl = 'https://ojqa6cyccprw6djbm5htc2nulq0pyobn.lambda-url.ap-south-1.on.aws/';
                        const testUrl = `${testBaseUrl}?id=${userId}&project_id=${currentProjectId}&work_id=${recordId}`;

                        const testResponse = await fetch(testUrl, {
                            method: 'POST',
                            body: testFormData
                        });

                        if (!testResponse.ok) {
                            throw new Error(`Test Case Lambda Generation service failed with status: ${testResponse.status}`);
                        }

                        const testResult = await testResponse.json();
                        if (testResult.status === 'success' || testResult.success) {
                            const docxFile = testResult.files?.docx;
                            const fileUrl = docxFile?.display_url || docxFile?.download_url;
                            if (docxFile && fileUrl) {
                                testGeneratedFileName = docxFile.filename || testGeneratedFileName;
                                testGeneratedUrl = fileUrl;
                                console.log(`Test Case generated successfully via Lambda:`, testGeneratedUrl);
                                setAiBuildStep(5);
                                setAiBuildProgress(99);
                            } else {
                                console.warn('Test Case Lambda response success, but missing docx.display_url or docx.download_url:', testResult);
                            }
                        } else {
                            throw new Error(testResult.message || 'Test Case Generation failed');
                        }
                    } catch (testLambdaErr) {
                        console.error(`Error during AI Lambda Test Case generation for ${rowName}:`, testLambdaErr);
                    }
                } else {
                    console.warn(`Missing required input files (FS/TS/Code). Skipping AI Test Case Lambda call.`);
                }

                // 4. Call the updateGeneratedFile API to append newly generated files
                const updatePayload = {
                    Auto_RICEW_AI_id: recordId,
                    approved_document_fs: '',
                    fs_file_name: fsGeneratedFileName,
                    fs_url: fsGeneratedUrl,
                    ts_file_name: tsGeneratedFileName,
                    ts_url: tsGeneratedUrl,
                    code_file_name: codeGeneratedFileName,
                    code_url: codeGeneratedUrl,
                    test_case_file_name: testGeneratedFileName,
                    test_case_url: testGeneratedUrl,
                    approved_document_ts: '',
                    approved_document_code: '',
                    approved_document_test_case: '',
                    updated_by: userId
                };

                const updateResponse = await fetch('https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/ricew/autoRICEWAI/updateGeneratedFile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(updatePayload)
                });

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    console.error(`Failed to append generated files for ${rowName}:`, errorText);
                } else {
                    const updateResult = await updateResponse.json();
                    console.log(`AI Generated Files appended successfully to record ${recordId} for ${rowName}:`, updateResult);

                    setGeneratedFilesData(prev => ({
                        ...prev,
                        [rowName]: {
                            approved_document_fs: '',
                            fs_file_name: fsGeneratedFileName,
                            fs_url: fsGeneratedUrl,
                            ts_file_name: tsGeneratedFileName,
                            ts_url: tsGeneratedUrl,
                            code_file_name: codeGeneratedFileName,
                            code_url: codeGeneratedUrl,
                            test_case_file_name: testGeneratedFileName,
                            test_case_url: testGeneratedUrl,
                            approved_document_ts: '',
                            approved_document_code: '',
                            approved_document_test_case: ''
                        }
                    }));

                    setSavedTimestamps(prev => ({
                        ...prev,
                        [rowName]: new Date().toISOString()
                    }));

                    // Send email notification that all files are successfully built
                    try {
                        console.log(`Triggering files built email notification for ${rowName}...`);
                        const emailPayload = {
                            toEmail: ownerData[rowName]?.ownerEmail || '',
                            clientName: ownerData[rowName]?.ownerName || '',
                            projectName: localStorage.getItem('project_name') || selectedProject?.name || projectName || 'ERP Enablement Project',
                            ricewName: row.RICEW_Name || '',
                            ricewType: row.RICEW_Type || '',
                            filesGenerated: [
                                fsGeneratedFileName,
                                tsGeneratedFileName,
                                codeGeneratedFileName,
                                testGeneratedFileName
                            ].filter(Boolean),
                            Auto_RICEW_AI_id: recordId,
                            Project_id: currentProjectId
                        };

                        const emailResponse = await fetch('https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/email-Send/auto-ricew-ai-files-built', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify(emailPayload)
                        });

                        if (emailResponse.ok) {
                            const emailResult = await emailResponse.json();
                            console.log(`Files built email notification sent successfully for ${rowName}:`, emailResult);
                        } else {
                            console.error(`Failed to send email notification for ${rowName}:`, await emailResponse.text());
                        }
                    } catch (emailErr) {
                        console.error(`Error sending email notification for ${rowName}:`, emailErr);
                    }
                }
            });

            await Promise.all(apiCalls);

            // Step 5 (Complete) Sequential Animation
            setAiBuildStep(5);
            setAiBuildProgress(100);
            await new Promise(resolve => setTimeout(resolve, 800));

            handleAIBuildComplete();
        } catch (error) {
            console.error("Error executing Auto RICEW AI creation/update API calls:", error);
        }
    };

    const handleAIBuildComplete = () => {
        const newlyCompleted = [...selectedRows];

        setGeneratedRows(prev => {
            const next = [...prev];
            newlyCompleted.forEach(row => {
                if (!next.includes(row)) {
                    next.push(row);
                }
            });
            return next;
        });

        // Push newly saved/generated rows to the bottom of the list reactively
        setRicewData(prevData => {
            return [...prevData].sort((a, b) => {
                const aSaved = newlyCompleted.includes(a.RICEW_Name) || generatedRows.includes(a.RICEW_Name);
                const bSaved = newlyCompleted.includes(b.RICEW_Name) || generatedRows.includes(b.RICEW_Name);

                if (aSaved && !bSaved) return 1;
                if (!aSaved && bSaved) return -1;

                if (aSaved && bSaved) {
                    const aTime = new Date(savedTimestamps[a.RICEW_Name] || a.updated_timestamp || a.created_timestamp || 0).getTime();
                    const bTime = new Date(savedTimestamps[b.RICEW_Name] || b.updated_timestamp || b.created_timestamp || 0).getTime();
                    return bTime - aTime;
                } else {
                    const aTime = new Date(a.updated_timestamp || a.created_timestamp || 0).getTime();
                    const bTime = new Date(b.updated_timestamp || b.created_timestamp || 0).getTime();
                    return bTime - aTime;
                }
            });
        });

        setSelectedRows([]);
        setSelectAll(false);
        setShowAIBuildPopup(false);
        
        // Silently reload data to properly arrange records from backend
        fetchApprovedRicewData(true);
    };

    const fetchResourceRoster = useCallback(async () => {
        const currentProjectId = localStorage.getItem('project_id') || projectId || '101';
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                if (handleAuthError) handleAuthError();
                return;
            }

            const response = await fetch(`https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/ricew/clientRoster/granted?Project_id=${currentProjectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.data) {
                    setResourceOptions(result.data.map(r => ({
                        id: r.Client_Roster_Form_id || '',
                        value: r.Client_Roster_Form_id || '',
                        label: r.Client_name || '',
                        displayName: r.Client_name || '',
                        email: r.Email || '',
                        userId: r.user_id || ''
                    })).filter(r => r.label !== '').sort((a, b) => {
                        const idA = parseInt(a.id) || 0;
                        const idB = parseInt(b.id) || 0;
                        return idA - idB;
                    }));
                }
            }
        } catch (error) {
            console.error("Error fetching client roster:", error);
        }
    }, [projectId, handleAuthError]);

    const fetchApprovedRicewData = useCallback(async (isSilent = false) => {
        if (isSilent !== true) setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                if (handleAuthError) handleAuthError();
                setLoading(false);
                return;
            }

            const currentProjectId = localStorage.getItem('project_id') || projectId || '101';

            // 1. Fetch approved RICEW requests
            const approvedPromise = fetch(`https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/ricew/ricewRequest/approved?Project_id=${currentProjectId}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // 2. Fetch saved Auto RICEW AI records
            const generatedPromise = fetch(`https://c8qe6e0fw7.execute-api.ap-south-1.amazonaws.com/New/ricew/autoRICEWAI/getAll?Project_id=${currentProjectId}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const [approvedRes, generatedRes] = await Promise.all([approvedPromise, generatedPromise]);

            if (approvedRes.status === 401 || approvedRes.status === 403 || generatedRes.status === 401 || generatedRes.status === 403) {
                if (handleAuthError) handleAuthError();
                return;
            }

            let approvedList = [];
            let savedRecordsList = [];

            if (approvedRes.ok) {
                const approvedResult = await approvedRes.json();
                approvedList = approvedResult.data || [];
            }

            if (generatedRes.ok) {
                const generatedResult = await generatedRes.json();
                savedRecordsList = generatedResult.data || [];
            }

            // Map and extract saved RICEW objects properties
            const generatedNames = [];
            const savedOwnerData = {};
            const savedUploadedFiles = {};
            const savedUploadedFileUrls = {};
            const savedUploadedFileStampedNames = {};
            const savedGeneratedFilesData = {};
            const savedRecordIdsMap = {};
            const savedTimestampsMap = {};

            savedRecordsList.forEach(record => {
                if (record.RICEW_Name) {
                    generatedNames.push(record.RICEW_Name);

                    if (record.Auto_RICEW_AI_id) {
                        savedRecordIdsMap[record.RICEW_Name] = record.Auto_RICEW_AI_id;
                    }

                    // Pre-populate Functional Owner from database
                    if (record.Client_Roster_Form_id) {
                        savedOwnerData[record.RICEW_Name] = {
                            resourceId: record.Client_Roster_Form_id,
                            ownerName: record.Client_Roster_Name || '',
                            ownerEmail: record.Client_Roster_Email || ''
                        };
                    }

                    // Pre-populate Uploaded Requirement File from database
                    if (record.requirement_files && Array.isArray(record.requirement_files)) {
                        savedUploadedFiles[record.RICEW_Name] = record.requirement_files.map(f => f.file_name);
                        savedUploadedFileUrls[record.RICEW_Name] = record.requirement_files.map(f => f.file_url);
                        savedUploadedFileStampedNames[record.RICEW_Name] = record.requirement_files.map(f => {
                            const url = f.file_url || '';
                            return url.replace('https://d1z1oiez6i3mzi.cloudfront.net/', '');
                        });
                    } else {
                        // Fallback to legacy string formats in case old records exist
                        savedUploadedFiles[record.RICEW_Name] = record.requirement_file_name ? record.requirement_file_name.split(',').map(s => s.trim()) : [];
                        savedUploadedFileUrls[record.RICEW_Name] = record.requirement_file_url ? record.requirement_file_url.split(',').map(s => s.trim()) : [];
                        savedUploadedFileStampedNames[record.RICEW_Name] = savedUploadedFileUrls[record.RICEW_Name].map(url => url.replace('https://d1z1oiez6i3mzi.cloudfront.net/', ''));
                    }

                    // Pre-populate AI Generated Files details from database (retrieve the latest generation attempt)
                    if (record.AI_Generated_File && record.AI_Generated_File.length > 0) {
                        savedGeneratedFilesData[record.RICEW_Name] = record.AI_Generated_File[record.AI_Generated_File.length - 1];
                    }

                    // Store timestamp for sorting
                    savedTimestampsMap[record.RICEW_Name] = record.updated_timestamp || record.created_timestamp || '';
                }
            });

            setGeneratedRows(generatedNames);
            setOwnerData(prev => ({ ...prev, ...savedOwnerData }));
            setUploadedFiles(prev => ({ ...prev, ...savedUploadedFiles }));
            setUploadedFileUrls(prev => ({ ...prev, ...savedUploadedFileUrls }));
            setUploadedFileStampedNames(prev => ({ ...prev, ...savedUploadedFileStampedNames }));
            setGeneratedFilesData(prev => ({ ...prev, ...savedGeneratedFilesData }));
            setSavedRecordIds(savedRecordIdsMap);
            setSavedTimestamps(savedTimestampsMap);

            // Sort logic: Move generated (saved) RICEW requests to the LAST (bottom) of the list
            // For both lists, sort by updated_timestamp (latest should be first)
            const sortedData = [...approvedList].sort((a, b) => {
                const aSaved = generatedNames.includes(a.RICEW_Name);
                const bSaved = generatedNames.includes(b.RICEW_Name);

                if (aSaved && !bSaved) return 1;
                if (!aSaved && bSaved) return -1;

                if (aSaved && bSaved) {
                    const aTime = new Date(savedTimestampsMap[a.RICEW_Name] || a.updated_timestamp || a.created_timestamp || 0).getTime();
                    const bTime = new Date(savedTimestampsMap[b.RICEW_Name] || b.updated_timestamp || b.created_timestamp || 0).getTime();
                    return bTime - aTime;
                } else {
                    const aTime = new Date(a.updated_timestamp || a.created_timestamp || 0).getTime();
                    const bTime = new Date(b.updated_timestamp || b.created_timestamp || 0).getTime();
                    return bTime - aTime;
                }
            });

            setRicewData(sortedData);

        } catch (error) {
            console.error("Error fetching approved and saved RICEW data:", error);
        } finally {
            if (isSilent !== true) setLoading(false);
        }
    }, [projectId, handleAuthError]);

    useEffect(() => {
        fetchApprovedRicewData();
        fetchResourceRoster();
    }, [fetchApprovedRicewData, fetchResourceRoster]);

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-') return url;

        let finalUrl = url;
        if (!url.startsWith('http')) {
            // If the URL is relative, prepend the CloudFront base URL
            finalUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${url.startsWith('/') ? url.slice(1) : url}`;
        }

        const extension = (fileName || finalUrl.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            // Microsoft Office Viewer handles both Excel and Word files
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(finalUrl)}`;
        }
        return finalUrl;
    };

    const handleOwnerChange = (ricewName, resourceId, email, displayName) => {
        setOwnerData(prev => ({
            ...prev,
            [ricewName]: {
                resourceId,
                ownerEmail: email,
                ownerName: displayName
            }
        }));
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setSelectAll(isChecked);
        if (isChecked) {
            const readyRows = ricewData
                .filter(row => ownerData[row.RICEW_Name]?.resourceId &&
                    ((uploadedFiles[row.RICEW_Name] && uploadedFiles[row.RICEW_Name].length > 0) ||
                        (selectedLocalFiles[row.RICEW_Name] && selectedLocalFiles[row.RICEW_Name].length > 0)) &&
                    !generatedRows.includes(row.RICEW_Name))
                .map(item => item.RICEW_Name);
            setSelectedRows(readyRows);
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (name) => {
        setSelectedRows(prev => {
            if (prev.includes(name)) {
                return prev.filter(rowName => rowName !== name);
            } else {
                return [...prev, name];
            }
        });
    };

    const [uploadedFiles, setUploadedFiles] = useState({});
    const [uploadedFileUrls, setUploadedFileUrls] = useState({});
    const [uploadedFileStampedNames, setUploadedFileStampedNames] = useState({});
    const [selectedLocalFiles, setSelectedLocalFiles] = useState({}); // { [ricewName]: File[] }
    const [generatedFilesData, setGeneratedFilesData] = useState({}); // { [ricewName]: AI_Generated_File object }
    const [uploadingState, setUploadingState] = useState({}); // { [ricewName]: boolean }
    const [savedRecordIds, setSavedRecordIds] = useState({}); // { [ricewName]: Auto_RICEW_AI_id }

    const handleFileChange = (e, ricewName) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const currentUploadedCount = (uploadedFiles[ricewName] || []).length;
        const currentLocalCount = (selectedLocalFiles[ricewName] || []).length;
        const totalExisting = currentUploadedCount + currentLocalCount;

        if (totalExisting + files.length > 5) {
            setCustomAlert({
                show: true,
                message: `You can only upload a maximum of 5 files. You have already uploaded/selected ${totalExisting} file(s).`
            });
            e.target.value = '';
            return;
        }

        setSelectedLocalFiles(prev => ({
            ...prev,
            [ricewName]: [...(prev[ricewName] || []), ...files]
        }));
        e.target.value = '';
    };

    const handleRemoveLocalFile = (ricewName, indexToRemove) => {
        setSelectedLocalFiles(prev => {
            const currentFiles = prev[ricewName] || [];
            const updated = currentFiles.filter((_, idx) => idx !== indexToRemove);
            return {
                ...prev,
                [ricewName]: updated
            };
        });
    };

    const handleRemoveUploadedFile = (ricewName, indexToRemove) => {
        setUploadedFiles(prev => {
            const current = prev[ricewName] || [];
            return { ...prev, [ricewName]: current.filter((_, idx) => idx !== indexToRemove) };
        });
        setUploadedFileUrls(prev => {
            const current = prev[ricewName] || [];
            return { ...prev, [ricewName]: current.filter((_, idx) => idx !== indexToRemove) };
        });
        setUploadedFileStampedNames(prev => {
            const current = prev[ricewName] || [];
            return { ...prev, [ricewName]: current.filter((_, idx) => idx !== indexToRemove) };
        });
    };

    const triggerFileInput = (ricewName) => {
        document.getElementById(`file-input-${ricewName}`).click();
    };

    const columnStyles = {
        srNo: { width: '60px', flex: '0 0 60px' },
        ricewName: { flex: 1, minWidth: '150px' },
        ricewType: { flex: 1, minWidth: '120px' },
        ricewStatus: { flex: 1, minWidth: '120px' },
        docUpload: { flex: 1, minWidth: '200px' },
        ownerName: { flex: 1, minWidth: '250px' },
        ownerEmail: { flex: 1, minWidth: '280px' },
        select: { width: '80px', flex: '0 0 80px' },
        fs: { width: '180px', flex: '0 0 180px' },
        ts: { width: '180px', flex: '0 0 180px' },
        code: { width: '180px', flex: '0 0 180px' },
        testScript: { width: '180px', flex: '0 0 180px' },
        feedback: { width: '150px', flex: '0 0 150px' }
    };

    const headerCellStyle = {
        padding: '12px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#333',
        borderRight: '1px solid #ddd',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
    };

    const bodyCellStyle = {
        padding: '16px 12px',
        fontSize: '13px',
        borderRight: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1320px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    minHeight: '80vh'
                }}>

                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || projectName || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{
                        marginTop: '0',
                        marginRight: "0px",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 2rem'
                    }}>
                        <h2 style={{ margin: 0 }}>Auto RICEW AI</h2>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {/* Action Buttons Row */}
                        <div style={{
                            display: 'flex',
                            width: '100%',
                            padding: '8px 1px', // 1px on left to match table border
                            alignItems: 'flex-end',
                            minWidth: '2150px'
                        }}>
                            {/* Spacers to align with preceding columns - each with 1px border offset to match table columns */}
                            <div style={{ ...columnStyles.srNo, borderRight: '1px solid transparent' }}></div>
                            <div style={{ ...columnStyles.ricewName, borderRight: '1px solid transparent' }}></div>
                            <div style={{ ...columnStyles.ricewType, borderRight: '1px solid transparent' }}></div>
                            <div style={{ ...columnStyles.ricewStatus, borderRight: '1px solid transparent' }}></div>
                            <div style={{ ...columnStyles.docUpload, borderRight: '1px solid transparent' }}></div>
                            <div style={{ ...columnStyles.ownerName, borderRight: '1px solid transparent' }}></div>
                            <div style={{ ...columnStyles.ownerEmail, borderRight: '1px solid transparent' }}></div>

                            {/* Button aligned with Select Column */}
                            <div style={{
                                ...columnStyles.select,
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '0 12px' // Match header cell padding
                            }}>
                                <button
                                    onClick={handleAIBuildClick}
                                    disabled={selectedRows.length === 0}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: selectedRows.length > 0 ? '#007bff' : '#cccccc',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap',
                                        width: 'max-content',
                                        boxShadow: selectedRows.length > 0 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                        opacity: selectedRows.length > 0 ? 1 : 0.7
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedRows.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#0069d9';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedRows.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#007bff';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>
                                    AI Build
                                </button>
                            </div>

                            {/* Spacers for columns AFTER Select to ensure horizontal alignment */}
                            <div style={{ ...columnStyles.fs }}></div>
                            <div style={{ ...columnStyles.ts }}></div>
                            <div style={{ ...columnStyles.code }}></div>
                            <div style={{ ...columnStyles.testScript }}></div>
                            <div style={{ ...columnStyles.feedback }}></div>
                        </div>

                        {/* Table Container */}
                        <div style={{
                            border: '1px solid #ddd',
                            overflowX: 'auto',
                            width: '100%',
                            boxSizing: 'border-box',
                            marginTop: '10px'
                        }}>
                            {/* Table Header Row */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid #ddd',
                                backgroundColor: 'white',
                                minWidth: '2150px'
                            }}>
                                <div style={{ ...columnStyles.srNo, ...headerCellStyle }}>Sr. No.</div>
                                <div style={{ ...columnStyles.ricewName, ...headerCellStyle, justifyContent: 'flex-start', textAlign: 'left' }}>RICEW Name</div>
                                <div style={{ ...columnStyles.ricewType, ...headerCellStyle }}>RICEW Type</div>
                                <div style={{ ...columnStyles.ricewStatus, ...headerCellStyle }}>RICEW Status</div>
                                <div style={{ ...columnStyles.docUpload, ...headerCellStyle }}>Document Upload</div>
                                <div style={{ ...columnStyles.ownerName, ...headerCellStyle }}>Functional Owner Name</div>
                                <div style={{ ...columnStyles.ownerEmail, ...headerCellStyle }}>Functional Owner Email</div>
                                <div style={{ ...columnStyles.select, ...headerCellStyle, flexDirection: 'column' }}>
                                    <div>Select</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        style={{ cursor: 'pointer', marginTop: '6px' }}
                                    />
                                </div>
                                <div style={{ ...columnStyles.fs, ...headerCellStyle }}>FS</div>
                                <div style={{ ...columnStyles.ts, ...headerCellStyle }}>TS</div>
                                <div style={{ ...columnStyles.code, ...headerCellStyle }}>Code</div>
                                <div style={{ ...columnStyles.testScript, ...headerCellStyle }}>Test Script</div>
                                <div style={{ ...columnStyles.feedback, ...headerCellStyle }}>Feedback</div>
                            </div>

                            {/* Table Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: '2150px',
                                backgroundColor: 'white'
                            }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading approved RICEW objects...</div>
                                ) : ricewData.length > 0 ? (
                                    ricewData.map((row, index) => (
                                        <div
                                            key={row.RICEW_Name}
                                            style={{
                                                display: 'flex',
                                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9',
                                                borderBottom: '1px solid #ddd',
                                                color: '#333'
                                            }}
                                        >
                                            <div style={{ ...columnStyles.srNo, ...bodyCellStyle }}>{index + 1}</div>
                                            <div style={{ ...columnStyles.ricewName, ...bodyCellStyle, justifyContent: 'flex-start', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>{row.RICEW_Name}</div>
                                            <div style={{ ...columnStyles.ricewType, ...bodyCellStyle }}>{row.RICEW_Type}</div>
                                            <div style={{ ...columnStyles.ricewStatus, ...bodyCellStyle }}>{row.RICEW_Status}</div>
                                            <div style={{ ...columnStyles.docUpload, ...bodyCellStyle }}>
                                                <input
                                                    type="file"
                                                    id={`file-input-${row.RICEW_Name}`}
                                                    style={{ display: 'none' }}
                                                    accept=".pdf,.docx,.doc,.xls,.xlsx,.txt,.log,image/*,audio/*"
                                                    multiple
                                                    onChange={(e) => handleFileChange(e, row.RICEW_Name)}
                                                />
                                                {((uploadedFiles[row.RICEW_Name] && uploadedFiles[row.RICEW_Name].length > 0) || (selectedLocalFiles[row.RICEW_Name] && selectedLocalFiles[row.RICEW_Name].length > 0)) ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'stretch',
                                                        gap: '6px',
                                                        width: '100%',
                                                        maxHeight: '120px',
                                                        overflowY: 'auto',
                                                        padding: '4px 0'
                                                    }}>
                                                        {/* Render already uploaded files */}
                                                        {uploadedFiles[row.RICEW_Name] && uploadedFiles[row.RICEW_Name].map((fileName, fIdx) => {
                                                            const fileUrl = uploadedFileUrls[row.RICEW_Name]?.[fIdx] || '';
                                                            return (
                                                                <div key={`uploaded-${fIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                                                    <a
                                                                        href={getFileViewUrl(fileUrl, fileName)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px',
                                                                            backgroundColor: '#eff6ff',
                                                                            padding: '6px 12px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #bfdbfe',
                                                                            color: '#2563eb',
                                                                            flex: 1,
                                                                            boxSizing: 'border-box',
                                                                            textDecoration: 'none',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s ease',
                                                                            fontSize: '11px',
                                                                            fontWeight: '600',
                                                                            minWidth: 0
                                                                        }}
                                                                        title={fileName}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.backgroundColor = '#dbeafe';
                                                                            e.currentTarget.style.borderColor = '#93c5fd';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                                                            e.currentTarget.style.borderColor = '#bfdbfe';
                                                                        }}
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                                        <span style={{
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            textAlign: 'left'
                                                                        }}>
                                                                            {fileName}
                                                                        </span>
                                                                    </a>
                                                                    {!generatedRows.includes(row.RICEW_Name) && (
                                                                        <button
                                                                            onClick={() => handleRemoveUploadedFile(row.RICEW_Name, fIdx)}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                color: '#ef4444',
                                                                                cursor: 'pointer',
                                                                                padding: '4px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                borderRadius: '4px',
                                                                                transition: 'background-color 0.2s'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            title="Remove File"
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {/* Render locally selected files */}
                                                        {selectedLocalFiles[row.RICEW_Name] && selectedLocalFiles[row.RICEW_Name].map((file, fIdx) => (
                                                            <div key={`local-${fIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                                                <a
                                                                    href={URL.createObjectURL(file)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        backgroundColor: '#fffbeb',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #fef3c7',
                                                                        color: '#b45309',
                                                                        flex: 1,
                                                                        boxSizing: 'border-box',
                                                                        textDecoration: 'none',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease',
                                                                        fontSize: '11px',
                                                                        fontWeight: '600',
                                                                        minWidth: 0
                                                                    }}
                                                                    title={`${file.name} (Local - Click to Preview)`}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundColor = '#fef3c7';
                                                                        e.currentTarget.style.borderColor = '#f59e0b';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundColor = '#fffbeb';
                                                                        e.currentTarget.style.borderColor = '#fef3c7';
                                                                    }}
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                                    <span style={{
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        textAlign: 'left'
                                                                    }}>
                                                                        {file.name}
                                                                    </span>
                                                                </a>
                                                                <button
                                                                    onClick={() => handleRemoveLocalFile(row.RICEW_Name, fIdx)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#ef4444',
                                                                        cursor: 'pointer',
                                                                        padding: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        borderRadius: '4px',
                                                                        transition: 'background-color 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    title="Remove File"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {!generatedRows.includes(row.RICEW_Name) && (
                                                            <button
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#3b82f6',
                                                                    cursor: 'pointer',
                                                                    fontSize: '11px',
                                                                    fontWeight: '600',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    transition: 'all 0.2s ease',
                                                                    textDecoration: 'none'
                                                                }}
                                                                onClick={() => triggerFileInput(row.RICEW_Name)}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                + Add More Files
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => triggerFileInput(row.RICEW_Name)}
                                                        disabled={uploadingState[row.RICEW_Name]}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            backgroundColor: uploadingState[row.RICEW_Name] ? '#f3f4f6' : '#ffffff',
                                                            border: uploadingState[row.RICEW_Name] ? '1px solid #d1d5db' : '1px solid #3b82f6',
                                                            borderRadius: '4px',
                                                            cursor: uploadingState[row.RICEW_Name] ? 'not-allowed' : 'pointer',
                                                            fontSize: '12px',
                                                            color: uploadingState[row.RICEW_Name] ? '#9ca3af' : '#3b82f6',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!uploadingState[row.RICEW_Name]) {
                                                                e.currentTarget.style.backgroundColor = '#3b82f6';
                                                                e.currentTarget.style.color = '#ffffff';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!uploadingState[row.RICEW_Name]) {
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#3b82f6';
                                                            }
                                                        }}
                                                    >
                                                        {uploadingState[row.RICEW_Name] ? (
                                                            <>
                                                                <span className="ai-spinner" style={{ width: '12px', height: '12px', border: '2px solid #ccc', borderTopColor: '#3b82f6', borderRadius: '50%', display: 'inline-block', marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }}></span>
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                                    <polyline points="17 8 12 3 7 8"></polyline>
                                                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                                                </svg>
                                                                Upload
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ ...columnStyles.ownerName, borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '4px 8px', overflow: 'visible', position: 'relative' }}>
                                                <div style={{ width: '100%' }}>
                                                    <FunctionalResourceAutocomplete
                                                        value={ownerData[row.RICEW_Name]?.resourceId || ''}
                                                        emailValue={ownerData[row.RICEW_Name]?.ownerEmail || ''}
                                                        options={resourceOptions}
                                                        onChange={(resourceId, email, displayName) => {
                                                            handleOwnerChange(row.RICEW_Name, resourceId, email, displayName);
                                                        }}
                                                        projectId={localStorage.getItem('project_id') || projectId || '101'}
                                                        rowIndex={index}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ ...columnStyles.ownerEmail, ...bodyCellStyle }}>
                                                {ownerData[row.RICEW_Name]?.ownerEmail || '-'}
                                            </div>
                                            <div style={{ ...columnStyles.select, ...bodyCellStyle }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(row.RICEW_Name)}
                                                    onChange={() => handleSelectRow(row.RICEW_Name)}
                                                    disabled={!ownerData[row.RICEW_Name]?.resourceId || !(uploadedFiles[row.RICEW_Name] || selectedLocalFiles[row.RICEW_Name]) || generatedRows.includes(row.RICEW_Name)}
                                                    title={generatedRows.includes(row.RICEW_Name) ? "RICEW Object assets already generated" : (!ownerData[row.RICEW_Name]?.resourceId || !(uploadedFiles[row.RICEW_Name] || selectedLocalFiles[row.RICEW_Name])) ? "Please select a Functional Owner and upload a Document first" : ""}
                                                    style={{
                                                        cursor: (generatedRows.includes(row.RICEW_Name) || !ownerData[row.RICEW_Name]?.resourceId || !(uploadedFiles[row.RICEW_Name] || selectedLocalFiles[row.RICEW_Name])) ? 'not-allowed' : 'pointer',
                                                        opacity: (generatedRows.includes(row.RICEW_Name) || !ownerData[row.RICEW_Name]?.resourceId || !(uploadedFiles[row.RICEW_Name] || selectedLocalFiles[row.RICEW_Name])) ? 0.5 : 1
                                                    }}
                                                />
                                            </div>
                                            <div style={{ ...columnStyles.fs, ...bodyCellStyle }}>
                                                {generatedRows.includes(row.RICEW_Name) ? (
                                                    renderDeliverableBadge('fs', generatedFilesData[row.RICEW_Name]?.fs_file_name || `FS_${row.RICEW_Name}.docx`, getFileViewUrl(generatedFilesData[row.RICEW_Name]?.fs_url, generatedFilesData[row.RICEW_Name]?.fs_file_name), generatedFilesData[row.RICEW_Name]?.approved_document_fs)
                                                ) : '-'}
                                            </div>
                                            <div style={{ ...columnStyles.ts, ...bodyCellStyle }}>
                                                {generatedRows.includes(row.RICEW_Name) ? (
                                                    renderDeliverableBadge('ts', generatedFilesData[row.RICEW_Name]?.ts_file_name || `TS_${row.RICEW_Name}.docx`, getFileViewUrl(generatedFilesData[row.RICEW_Name]?.ts_url, generatedFilesData[row.RICEW_Name]?.ts_file_name), generatedFilesData[row.RICEW_Name]?.approved_document_ts)
                                                ) : '-'}
                                            </div>
                                            <div style={{ ...columnStyles.code, ...bodyCellStyle }}>
                                                {generatedRows.includes(row.RICEW_Name) ? (
                                                    renderDeliverableBadge('code', generatedFilesData[row.RICEW_Name]?.code_file_name || `${row.RICEW_Name}.sql`, getFileViewUrl(generatedFilesData[row.RICEW_Name]?.code_url, generatedFilesData[row.RICEW_Name]?.code_file_name), generatedFilesData[row.RICEW_Name]?.approved_document_code)
                                                ) : '-'}
                                            </div>
                                            <div style={{ ...columnStyles.testScript, ...bodyCellStyle }}>
                                                {generatedRows.includes(row.RICEW_Name) ? (
                                                    renderDeliverableBadge('testScript', generatedFilesData[row.RICEW_Name]?.test_case_file_name || `Test_${row.RICEW_Name}.docx`, getFileViewUrl(generatedFilesData[row.RICEW_Name]?.test_case_url, generatedFilesData[row.RICEW_Name]?.test_case_file_name), generatedFilesData[row.RICEW_Name]?.approved_document_test_case)
                                                ) : '-'}
                                            </div>
                                            <div style={{ ...columnStyles.feedback, ...bodyCellStyle }}>
                                                <button
                                                    onClick={() => handleFeedbackClick(row.RICEW_Name)}
                                                    style={{
                                                        backgroundColor: '#4D5C74',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 14px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        transition: 'background-color 0.2s',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#3b4b5e'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#4D5C74'}
                                                >
                                                    Feedback
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No approved RICEW objects found for this project.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showAIBuildPopup && (
                <AIBuildProgressPopup
                    selectedItems={selectedRows}
                    currentStep={aiBuildStep}
                    progress={aiBuildProgress}
                />
            )}

            {showFeedbackModal && (
                <AutoRICEWFeedbackPopView
                    ricewName={feedbackRow}
                    recordId={savedRecordIds[feedbackRow]}
                    projectId={projectId}
                    onClose={() => setShowFeedbackModal(false)}
                />
            )}

            {customAlert.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000,
                    fontFamily: 'inherit'
                }}>
                    <div style={{
                        width: '400px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                        padding: '24px',
                        color: '#333',
                        animation: 'pop 0.2s ease-out',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            color: '#ef4444'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Upload Limit Exceeded</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                            {customAlert.message}
                        </p>
                        <button
                            onClick={() => setCustomAlert({ show: false, message: '' })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const renderDeliverableBadge = (type, label, url, approvalStatus) => {
    let bg, color, border, icon;
    switch (type) {
        case 'fs':
            bg = '#e0f2fe'; color = '#0369a1'; border = '#bae6fd';
            icon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
            );
            break;
        case 'ts':
            bg = '#f3e8ff'; color = '#6b21a8'; border = '#e9d5ff';
            icon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M8 13h2v2H8z"></path>
                    <path d="M14 13h2v2h-2z"></path>
                </svg>
            );
            break;
        case 'code':
            bg = '#fef3c7'; color = '#92400e'; border = '#fde68a';
            icon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', flexShrink: 0 }}>
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
            );
            break;
        case 'testScript':
            bg = '#d1fae5'; color = '#065f46'; border = '#a7f3d0';
            icon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', flexShrink: 0 }}>
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
            );
            break;
        default:
            bg = '#f3f4f6'; color = '#374151'; border = '#e5e7eb';
            icon = null;
    }

    const hasUrl = !!(url && url !== '-');
    const isApproved = approvalStatus === 'true';
    const isRejected = approvalStatus === 'false';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
            <a
                href={url || '#'}
                target={hasUrl ? "_blank" : undefined}
                rel={hasUrl ? "noopener noreferrer" : undefined}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bg,
                    color: color,
                    border: `1px solid ${border}`,
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: hasUrl ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    userSelect: 'none',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    textDecoration: 'none',
                    pointerEvents: hasUrl ? 'auto' : 'none',
                    opacity: hasUrl ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                    if (hasUrl) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
                        e.currentTarget.style.filter = 'brightness(0.95)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (hasUrl) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        e.currentTarget.style.filter = 'brightness(1)';
                    }
                }}
                title={hasUrl ? `Click to view ${label}` : `${label} not generated yet`}
            >
                {icon}
                <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {label}
                </span>
            </a>
            {isApproved && (
                <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#2e7d32',
                    backgroundColor: '#e8f5e9',
                    border: '1px solid #c8e6c9',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    textTransform: 'uppercase',
                    lineHeight: '1',
                    marginTop: '2px'
                }}>
                    Approved
                </span>
            )}
            {isRejected && (
                <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#c62828',
                    backgroundColor: '#ffebee',
                    border: '1px solid #ffcdd2',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    textTransform: 'uppercase',
                    lineHeight: '1',
                    marginTop: '2px'
                }}>
                    Rejected
                </span>
            )}
        </div>
    );
};

const AIBuildProgressPopup = ({ selectedItems, currentStep, progress }) => {

    const steps = [
        { id: 1, label: 'Functional Specification (FS)', activeMsg: 'Extracting requirements & generating FS document...', doneMsg: 'Functional Specification generated successfully.' },
        { id: 2, label: 'Technical Specification (TS)', activeMsg: 'Analyzing FS structure & generating Technical Design...', doneMsg: 'Technical Specification generated successfully.' },
        { id: 3, label: 'Implementation Code', activeMsg: 'Translating designs into optimized SQL, PL/SQL, and logic...', doneMsg: 'Source code generated successfully.' },
        { id: 4, label: 'Test Script & Cases', activeMsg: 'Creating test scenarios, scripts & QA verification matrices...', doneMsg: 'Test scripts & cases generated successfully.' }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            fontFamily: 'inherit'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pop {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .ai-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid #e2e8f0;
                    border-top-color: #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
                .ai-progress-bar {
                    background: linear-gradient(90deg, #007bff 0%, #3b82f6 50%, #60a5fa 100%);
                    background-size: 200% 100%;
                }
            `}} />

            <div style={{
                width: '600px',
                backgroundColor: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                padding: '30px',
                color: '#333',
                animation: 'pop 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #007bff, #00c6ff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0, 123, 255, 0.25)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#333' }}>AutoRICEW AI Build Engine</h2>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#666' }}>
                            Building RICEW assets for: <span style={{ color: '#007bff', fontWeight: '600' }}>{selectedItems.join(', ')}</span>
                        </p>
                    </div>
                </div>

                {/* Progress bar container */}
                <div style={{ marginBottom: '25px', backgroundColor: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Overall AI Build Progress</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#007bff' }}>{Math.min(currentStep, 4)}/4</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                        <div className="ai-progress-bar" style={{ width: `${progress}%`, height: '100%', transition: 'width 0.1s linear' }} />
                    </div>
                </div>

                {/* Steps List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '10px' }}>
                    {steps.map((step) => {
                        const isCompleted = currentStep > step.id;
                        const isActive = currentStep === step.id;
                        const isPending = currentStep < step.id;

                        let cardBg = '#ffffff';
                        let cardBorder = '1px solid #e2e8f0';
                        let labelColor = '#64748b';
                        let descColor = '#94a3b8';
                        let badgeBg = '#f1f5f9';
                        let badgeColor = '#64748b';
                        let badgeBorder = '1px solid #cbd5e1';

                        if (isActive) {
                            cardBg = '#f0f7ff';
                            cardBorder = '1px solid #cce5ff';
                            labelColor = '#004085';
                            descColor = '#0056b3';
                            badgeBg = '#e8f4ff';
                            badgeColor = '#007bff';
                            badgeBorder = '1px solid #b3d7ff';
                        } else if (isCompleted) {
                            cardBg = '#e6f4ea';
                            cardBorder = '1px solid #ceead6';
                            labelColor = '#137333';
                            descColor = '#1e7e34';
                            badgeBg = '#e6f4ea';
                            badgeColor = '#137333';
                            badgeBorder = '1px solid #ceead6';
                        }

                        return (
                            <div key={step.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                backgroundColor: cardBg,
                                border: cardBorder,
                                transition: 'all 0.2s ease'
                            }}>
                                {/* Left Icon */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                                    {isCompleted ? (
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: '#137333',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(19, 115, 51, 0.2)'
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </div>
                                    ) : isActive ? (
                                        <div className="ai-spinner" />
                                    ) : (
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            border: '2px solid #cbd5e1',
                                            backgroundColor: 'transparent'
                                        }} />
                                    )}
                                </div>

                                {/* Step details */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: labelColor
                                    }}>
                                        {step.label}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: descColor,
                                        marginTop: '2px',
                                        fontWeight: isActive ? '500' : 'normal'
                                    }}>
                                        {isCompleted ? step.doneMsg : isActive ? step.activeMsg : 'Waiting to initiate...'}
                                    </div>
                                </div>

                                {/* Right Badge */}
                                <div>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        letterSpacing: '0.05em',
                                        backgroundColor: badgeBg,
                                        color: badgeColor,
                                        border: badgeBorder
                                    }}>
                                        {isCompleted ? 'Completed' : isActive ? 'Active' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer security tag */}
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Secure Sandbox Build Mode • Do not close or refresh this page</span>
                </div>
            </div>
        </div>
    );
};

export default AutoRICEWai;
