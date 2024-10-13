package eltako

import (
	"crypto/tls"
	"io"
	"net/http"
)

type HTTPClient struct {
	BaseURL   string
	Client    *http.Client
	AuthToken string
}

func NewHTTPClient(baseURL string) *HTTPClient {
	// Create a http.Client that ignores the certificate
	// errors. This is necessary because the Eltako devices
	// use self-signed certificates.
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	return &HTTPClient{
		BaseURL: baseURL,
		Client: &http.Client{
			Transport: tr,
		},
	}
}

func (c *HTTPClient) SetAuthToken(token string) {
	c.AuthToken = token
}

func (c *HTTPClient) GetAuthToken() string {
	return c.AuthToken
}

func (c *HTTPClient) Get(url string) (*http.Response, error) {
	return c.NewRequest("GET", url, nil)
}

func (c *HTTPClient) Post(url string, body io.Reader) (*http.Response, error) {
	return c.NewRequest("POST", url, body)
}

func (c *HTTPClient) Put(url string, body io.Reader) (*http.Response, error) {
	return c.NewRequest("PUT", url, body)
}

func (c *HTTPClient) NewRequest(method, url string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, c.BaseURL+url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	if c.AuthToken != "" {
		req.Header.Set("Authorization", c.AuthToken)
	}

	return c.Client.Do(req)
}
