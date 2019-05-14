    <%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
        <!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
        <%@ page import="java.io.*,java.util.*,com.ccavenue.transaction.util.*" %>
        <html>
        <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Response Handler</title>
        </head>
        <body>
            <%
		String workingKey = "F4364811982F6AD058E16AE6396FF129";		//32 Bit Alphanumeric Working Key should be entered here so that data can be decrypted.
		String encResp= request.getParameter("encResp");
		AesCryptUtil aesUtil=new AesCryptUtil(workingKey);
		String decResp = aesUtil.decrypt(encResp);
		LoggerUtil.info("ivrsResp.log",decResp);
		if(!decResp.contains("JSON")){
				StringTokenizer tokenizer = new StringTokenizer(decResp, "&");
				Hashtable hs=new Hashtable();
				String pair=null, pname=null, pvalue=null;
				while (tokenizer.hasMoreTokens()) {
					pair = (String)tokenizer.nextToken();
					if(pair!=null) {
						StringTokenizer strTok=new StringTokenizer(pair, "=");
						pname=""; pvalue="";
						if(strTok.hasMoreTokens()) {
							pname=(String)strTok.nextToken();
							if(strTok.hasMoreTokens())
								pvalue=(String)strTok.nextToken();
							hs.put(pname, pvalue);
						}
					}
				}

	%>
        <center>
        <font size="4" color="blue"><b>Response Page</b></font>
        <table border="1">
            <%
				Enumeration enumeration = hs.keys();
				while(enumeration.hasMoreElements()) {
					pname=""+enumeration.nextElement();
					pvalue=""+ hs.get(pname);

			%>
        <tr>
        <td><%= pname %>
        </td>
        <td><%= pvalue %>
        </td>
        </tr>
            <%

				}
		}else{
			%>
        <td><%= decResp %>
        </td>
            <%
		}
		%>
        </table>
        </center>
        </body>
        </html>
