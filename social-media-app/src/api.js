export const BaseUrl = "http://localhost:8057/";
export const BaseChatUrl = "http://localhost:8086/";
export const BasePostUrl = "http://localhost:8090/"; // Added for post service

export function callApi(requestmethod, url, data, responseHandler, headers = {}) {
  var option;
  if (requestmethod === "GET" || requestmethod === "DELETE") {
    option = { method: requestmethod, headers: { 'content-type': 'application/json', ...headers } };
  } else {
    option = { 
      method: requestmethod, 
      headers: data instanceof FormData ? { ...headers } : { 'content-type': 'application/json', ...headers }, 
      body: data instanceof FormData ? data : data 
    };
  }

  fetch(url, option)
    .then(response => {
      if (!response.ok) throw new Error(response.status + " " + response.statusText);
      return response.text();
    })
    .then(data => responseHandler(data))
    .catch(error => alert(error));
}

export function setSession(sesname, sesvalue, expday) {
  let D = new Date();
  D.setTime(D.getTime() + expday * 86400000);
  document.cookie = `${sesname}=${sesvalue};expires=${D.toUTCString()};path=/;secure`;
}

export function getSession(sesname) {
   let decodedCookie = decodeURIComponent(document.cookie);
   let cookieData = decodedCookie.split(';');
   for (let x in cookieData)
    if (cookieData[x].includes(sesname))
      return cookieData[x].substring(cookieData[x].indexOf(sesname) + sesname.length + 1);
    return "";
}