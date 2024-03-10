import React, {useState} from 'react';

interface AddressForm {
    address: string;
    error?: string;
}

interface AnalyzerResponse {
    job_id: string;
}

interface Links {
    internal_links: number;
    external_links: number;
    inaccessible_links: number;
}

interface ErrorInfo {
    code: number;
    message: string;
}

interface headings {
    level: string;
    count: number;
}

interface AnalyzeData {
    Id: string;
    target_url: string;
    job_status: number;
    title: string;
    html_version: string;
    headings: headings[] | null; // Adjust as per your response structure
    links: Links;
    is_login: boolean;
    error: ErrorInfo;
}

interface AnalyzeResponse {
    data: AnalyzeData;
}

const backendUrl = "http://localhost:8080"
const validateUrl = (url: string): string | undefined => {
    const pattern = /^(https?:\/\/www.)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[a-zA-Z0-9-_.~!*'();:@&=+$,%#]+)*\/?$/;
    if (!pattern.test(url)) {
        return 'Please enter a valid web address starting with "http://www." or "https://www.".';
    }
    if (!url.startsWith('http://www.') && !url.startsWith('https://www.')) {
        return 'Please include a full URL. ie: "https://www.google.com"';
    }
    return undefined;
};

const AddressForm: React.FC = () => {
    const [formData, setFormData] = useState<AddressForm>({address: ''});
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<AnalyzeResponse | null>(null);
    const [loading, setLoading] = useState(false);

    let jobId = "";

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({...formData, address: event.target.value});
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const error = validateUrl(formData.address);

        if (error) {
            setError(error);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(backendUrl + '/analyze/basic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    target_url: formData.address,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(`${errorData.data.code}: ${errorData.data.message}`);
                setLoading(false);
                return;
            }

            const data: AnalyzerResponse = await response.json();
            jobId = data.job_id;
            pollStatus(data.job_id);

        } catch (error) {
            setError('An error occurred while processing the request.');
            setLoading(false);
        }
    };

    const pollStatus = async (pollingJobId: string) => {
        try {
            let jobStatus = 0;
            while ((jobStatus !== 1 && jobStatus !== 2) && jobId === pollingJobId) {
                await new Promise((resolve) => setTimeout(resolve, 3000)); // Poll every 3 seconds

                const statusResponse = await fetch(backendUrl + `/analyze/status?job_id=${jobId}`);

                if (!statusResponse.ok) {
                    const errorData = await statusResponse.json();
                    setError(`${errorData.data.code}: ${errorData.data.message}`);
                    setLoading(false);
                    return;
                }

                const statusData: AnalyzeResponse = await statusResponse.json();
                if (statusData.data && typeof statusData.data.job_status === 'number') {
                    jobStatus = statusData.data.job_status;
                } else {
                    setError('Invalid job status data received.' + statusData.data);
                    setLoading(false);
                    return;
                }

                if (jobStatus === 1 || jobStatus === 2) {
                    setResponse(statusData);
                    setLoading(false);
                }
            }
        } catch (error) {
            setError('An error occurred while checking job status.');
            setLoading(false);
        }
    };

    const renderResponse = () => {
        if (response) {
            const indent = {
                marginLeft: '20px',
            };
            return (
                <div className="border p-4">
                    <h3>Analysis Result:</h3>
                    {/* Display analysis result based on job status */}
                    {response.data.job_status === 1 ? (
                        <div>
                            <p><b>Target URL</b>: {response.data.target_url}</p>
                            <p><b>Title</b>: {response.data.title}</p>
                            <p><b>HTML Version</b>: {response.data.html_version}</p>
                            {response.data.headings != null ? (
                                <p><b>Headings</b>: {
                                    response.data.headings.map((heading, index) => (
                                        <div key={index}>
                                            <p style={indent}>{`Level: ${heading.level} - Count: ${heading.count}`}</p>
                                        </div>
                                    ))
                                }</p>
                            ) : (
                                <p><b>Headings</b>: No Headings</p>
                            )}

                            <p><b>External Links</b>: {response.data.links.external_links}</p>
                            <p><b>Internal Links</b>: {response.data.links.internal_links}</p>
                            <p><b>Inaccessible Links</b>: {response.data.links.inaccessible_links}</p>

                            {response.data.is_login ? (
                                <p><b>Is Login Page Available</b>: True</p>
                            ) : (
                                <p><b>Is Login Page Available</b>: False</p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p>Failed to Analyze the provided URL</p>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="d-flex flex-column justify-content-center align-items-center">
            <div className="text-center">
                <h2>Welcome to the Website Analyzer</h2>
            </div>
            <div className="mt-4">
                <h4>Please enter the URL below:</h4>
            </div>
            <div className="mt-4">
                <form onSubmit={handleSubmit} className="text-center">
                    <div className="mb-3">
                        <input
                            type="text"
                            id="address"
                            name="address"
                            className="form-control"
                            placeholder="https://www.google.com"
                            value={formData.address}
                            onChange={handleChange}
                            required
                        />
                        {error && <div className="alert alert-danger mt-2">{error}</div>}
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status"
                                      aria-hidden="true"></span>
                                <span className="visually-hidden">Loading...</span>
                            </>
                        ) : (
                            'Submit'
                        )}
                    </button>
                </form>
                {loading && <div className="mt-3">Loading...</div>}
                {!loading && response && (
                    <div className="mt-3">Success! {renderResponse()}</div>
                )}
            </div>
        </div>
    );
};

export default AddressForm;
