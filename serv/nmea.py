import operator
import re
import threading
import socketserver

#: RegEx pattern for a strict NMEA sentence (mandatory checksum).
NMEApattern_strict = re.compile('''
        ^[^$]*\$?
        (?P<nmea_str>
            (?P<talker>\w{2})
            (?P<sentence_type>\w{3}),
            (?P<data>[^*]+)
        )(?:\\*(?P<checksum>[A-F0-9]{2}))
        [\\\r\\\n]*
        ''', re.X | re.IGNORECASE)

#: RegEx pattern for a lax NMEA sentence (optional checksum).
NMEApattern = re.compile('''
        ^[^$]*\$?
        (?P<nmea_str>
            (?P<talker>\w{2})
            (?P<sentence_type>\w{3}),
            (?P<data>[^*]+)
        )
        [\\\r\\\n]*
        ''', re.X | re.IGNORECASE)

def calcchecksum(nmea_str):
    #Strip '$' and everything after the '*'
    if nmea_str.startswith('$'):
        nmea_str = nmea_str[1:]
    if nmea_str.find('*') >= 0:
        nmea_str = nmea_str[:nmea_str.find('*')]

    # this returns a 2 digit hexadecimal string to use as a checksum.
    checksum = hex(reduce(operator.xor, map(ord, nmea_str), 0))[2:].upper()
    if len(checksum) == 2:
        return checksum
    else:
        return '0' + checksum

def formatSentence(sentence):
    if sentence.find('*') < 0:
        sentence = sentence + '*' + calcchecksum(sentence)
    if sentence.startswith('$') == False:
        sentence = '$' + sentence
    return sentence

def parseNMEA(nmea_str, strict=True):
    # parse NMEA string into dict of fields.
    # the data will be split by commas and accessible by index.
    match = None
    if strict:
        match = NMEApattern_strict.match(nmea_str)
    else:
        match = NMEApattern.match(nmea_str)

    if not match:
        raise ValueError('Could not parse data:', nmea_str)
    nmea_dict = {}
    nmea_dict['sentence'] = nmea_str
    nmea_str = match.group('nmea_str')
    nmea_dict['sentence_id'] = match.group('talker').upper() + match.group('sentence_type').upper()
    nmea_dict['talker'] = match.group('talker').upper()
    nmea_dict['sentence_type'] = match.group('sentence_type').upper()
    nmea_dict['data'] = match.group('data').split(',')
    
    if strict:
        checksum = match.group('checksum')
        # check the checksum to ensure matching data.
        if checksum != calcchecksum(nmea_str):
            raise ValueError('Checksum does not match: %s != %s.' %
                (checksum, calcchecksum(nmea_str)))
    return nmea_dict



class NMEAServer:
    #: The dictionary of handler functions for well-formed nmea messages.
    #: .. versionadded:: 1.0
    message_handlers = {}
    
    #: The handler to be called when a message with an unknown messageId is 
    #: received.
    #: .. versionadded:: 1.0
    missing_handlers = None
    
    #: An optional handler that when defined is called prior to any message 
    #: handler function.
    #: .. versionadded:: 1.0
    message_pre_handler = None
    
    #: An optional handler that when defined is called after any message 
    #: handler function.
    #: .. versionadded:: 1.0
    message_post_handler = None
    
    #: An optional handler that when defined is called when an error occurs.
    #: .. versionadded:: 1.0
    error_handler = None
    
    #: An optional handler that when defined is called when a message without a 
    #: checksum or with an invalid checksum is received.
    #: .. versionadded:: 1.0
    bad_checksum_message_handler = None
    
    #: An optional function that creates a connection-scoped dictionary that
    # represents the 'context' of that connection.
    #: .. versionadded:: 1.0
    connection_context_creator = None
    
    #: The host to start this NMEAServer on.
    host = None
    
    #: The port to start this NMEAServer on.
    port = None
    
    #: Whether the NMEAServer is to be run in debug mode.
    debug = False
    
    #: Whether this NMEAServer is being shutdown.
    shutdown_flag = False
    
    def __init__(self, host='', port=9000):
        self.host = host
        self.port = port
    
    def message(self, message_id):
        """A decorator that registers a function for handling a given message
        ID. Functionally identical to :meth:`add_message_handler` but offering
        a decorator wrapper::
        
            @NMEAServer.message('RBHRB')
            def HRB(connection_context, message):
                return nmea.formatSentence("$TXHRB,Success")

        :param message_id: the ID as string of the message to handle
        """

        def decorator(f):
            self.add_message_handler(message_id, f)
            return f

        return decorator
    
    def add_message_handler(self, message_id, handler_func=None):
        """Connects a handler function to a message_id.  Functionally identical
        to :meth:`message` decorator.  If a handler_func is provided it will be
        registered for the message_id.

        For example::

            @NMEAServer.message('RBHRB')
            def HRB(context, message):
                return nmea.formatSentence("$TXHRB,Success")

        Is the same as::

            def HRB(context, message):
                return nmea.formatSentence("$TXHRB,Success")
            app.add_message_handler('RBHRB', HRB)

        
        :param message_id: the ID as string of the message to handle
        :param handler_func: the function to call when a message is received
                             for the specific message_id
        """

        if message_id is not None:
            self.message_handlers[message_id] = handler_func
        else:
            raise AssertionError("Cannot bing a handler find to 'None'")
    
    def prehandler(self):
        """A decorator that registers a function for to be called before 
        message handlers. May be used to modify or suppress messages. 
        A prehandler will suppress a message if it lacks a 'return' statement
        or explicitly returns None. Functionally identical to 
        :meth:`add_prehandler` but offering a decorator wrapper::

            @NMEAServer.prehandler()
            def prehandler(context, message):
                if message.data[0] == 'S': # Example of message suppression
                    return None #To suppress the message
                if message[1] = 'M': #Example of modifying the message
                    message[2] =  'new value'
                    return message
                else:
                    return message
        """

        def decorator(f):
            self.add_prehandler(f)
            return f

        return decorator
    
    def add_prehandler(self, function=None):
        """A decorator that registers a function for to be called before 
        message handlers. May be used to modify or suppress messages. 
        A prehandler will suppress a message if it lacks a 'return' statement
        or explicitly returns None. Functionally identical to
        :meth:`prehandler` decorator.  Passing 'None' as the function 
        will remove the existing prehandler

        For example::

            @NMEAServer.prehandler()
            def prehandler(context, message):
                if message.data[0] == 'S': # Example of message suppression
                    return None #To suppress the message
                if message[1] = 'M': #Example of modifying the message
                    message[2] =  'new value'
                    return message
                else:
                    return message

        Is the same as::

            def prehandler(context, message):
                if message.data[0] == 'S': # Example of message suppression
                    return None #To suppress the message
                if message[1] = 'M': #Example of modifying the message
                    message[2] =  'new value'
                    return message
                else:
                    return message
            app.add_prehandler(prehandler)

        :param function: the function to call when a message is received
                             but before handlers are invoked.
        """

        self.message_pre_handler = function
    
    def posthandler(self):
        """A decorator that registers a function for to be called after the 
        message handlers. A posthandler can modify the response and even 
        suppress it if it lacks a 'return' statement or explicitly returns None. 
        Functionally identical to :meth:`add_posthandler` but offering a 
        decorator wrapper::

            @NMEAServer.posthandler()
            def posthandler(context, message, response):
                print("Printing response {}".format(response))
                return response
        """

        def decorator(f):
            self.add_posthandler(f)
            return f

        return decorator
    
    def add_posthandler(self, function=None):
        """A decorator that registers a function for to be called after the 
        message handlers. A posthandler can modify the response and even 
        suppress it if it lacks a 'return' statement or explicitly returns None.
        Functionally identical to :meth:`posthandler` decorator.  Passing 
        'None' as the function will remove the existing posthandler

        For example::

            @NMEAServer.posthandler()
            def posthandler(context, message, response):
                print("Printing response {}".format(response))
                return response

        Is the same as::

            def posthandler(context, message, response):
                print("Printing response {}".format(response))
                return response
            app.add_posthandler(posthandler)

        :param function: the function to call when a message is received
                             but before handlers are invoked.
        """

        self.message_post_handler = function
    
    def unknown_message(self):
        """A decorator that registers a function for to be called when an 
        unknown message is received. Functionally identical to 
        :meth:`add_unknown_message` but offering a decorator wrapper::

            @NMEAServer.unknown_message()
            def unknown(context, message):
                return nmea.formatSentence("TXERR, Unknown sentence received")
        """

        def decorator(f):
            self.add_unknown_message(f)
            return f

        return decorator
    
    def add_unknown_message(self, function=None):
        """A decorator that registers a function for to be called when an
        unknown message is received. Functionally identical to
        :meth:`unknown_message` decorator.  Passing 'None' as the function 
        will remove the existing unknown_message handler

        For example::

            @NMEAServer.unknown_message()
            def unknown(context, message):
                return nmea.formatSentence("TXERR, Unknown sentence received")

        Is the same as::

            def unknown(context, message):
                return nmea.formatSentence("TXERR, Unknown sentence received")
            app.add_unknown_message(unknown)

        :param function: the function to call when an unknown message is 
                        received
        """

        self.missing_handlers = function
    
    def connection_context_creator(self):
        """A decorator that registers a function for creating a connection
        context. Functionally identical to 
        :meth:`add_connection_context_creator` but offering a decorator::

            @NMEAServer.connection_context_creator()
            def context(default_context, message):
                default_context['app_name'] = 'demo'
                return default_context
        """
        
        def decorator(f):
            self.add_connection_context_creator(f)
            return f

        return decorator
    
    def add_connection_context_creator(self, function=None):
        """Registers a function to be invoked when a new connection is created
        to generate a custom connection context.  Functionally identical
        to :meth:`connection_context_creator` decorator.

        For example::

            @NMEAServer.connection_context_creator()
            def context(default_context, message):
                default_context['app_name'] = 'demo'
                return default_context

        Is the same as::

            def context(default_context, message):
                default_context['app_name'] = 'demo'
                return default_context
            app.add_connection_context_creator(context)

        
        :param function: the function to call when a connection is created
        """

        self.connection_context_creator = function
    
    def bad_checksum(self):
        """A decorator that registers a function for handling messages
        with bad checksums. Note that the parameter is a 'raw_message' as
        a string the message cannot be successfully parsed due to the invalid 
        checksum.Functionally identical to 
        :meth:`add_bad_checksum_message_handler` but offering a decorator::

            @NMEAServer.bad_checksum()
            def bad_checksum(context, raw_message):
                default_context['app_name'] = 'demo'
                return nmea.formatSentence('TDERR,Invalid Checksum received." \
                "Received *26 but correct checksum should have been *A2')
        """
        
        def decorator(f):
            self.add_bad_checksum_message_handler(f)
            return f

        return decorator
    
    def add_bad_checksum_message_handler(self, function=None):
        """Registers a function to be invoked when a message with a bad 
        checksum is received. Functionally identical to 
        :meth:`bad_checksum` decorator.

        For example::

            @NMEAServer.bad_checksum()
            def bad_checksum(context, raw_message):
                default_context['app_name'] = 'demo'
                return nmea.formatSentence('TDERR,Invalid Checksum received." \
                "Received *26 but correct checksum should have been *A2')

        Is the same as::

            def bad_checksum(context, raw_message):
                default_context['app_name'] = 'demo'
                return nmea.formatSentence('TDERR,Invalid Checksum received." \
                "Received *26 but correct checksum should have been *A2')
            app.add_bad_checksum_message_handler(bad_checksum)

        
        :param function: the function to call when a connection is created
        """

        self.bad_checksum_message_handler = function
    
    def error(self):
        """A decorator that registers a function for handling errors.
        Functionally identical to :meth:`add_error_handler` 
        but offering a decorator::

            @NMEAServer.error()
            def error(context, raw_message):
                print "something went wrong =("
        """
        
        def decorator(f):
            self.add_error_handler(f)
            return f

        return decorator
    
    def add_error_handler(self, function=None):
        """Registers a function to be invoked when an error occurs. Functionally identical to 
        :meth:`bad_checksum` decorator.

        For example::

            @NMEAServer.error()
            def error(context, raw_message):
                print "something went wrong =("

        Is the same as::

            def error(context, raw_message):
                print "something went wrong =("
            app.add_error_handler(error)

        :param function: the function to call when a connection is created
        """

        self.error_handler = function
    
    def dispatch(self, raw_message, connection_context):
        """Dispatch the messages received on the NMEAServer socket.
        May be extended, do not override."""
        
        if self.message_pre_handler is not None:
            self.message_pre_handler(connection_context, raw_message)
            
        self.data = raw_message
        try:
            if raw_message == '':
                raise EOFError("Empty message received. Ending comm")
            
            message = parseNMEA(raw_message)
            
            sentence_id = message['sentence_id']    
            response = None
            if self.message_handlers[sentence_id] is not None:
                response = self.message_handlers[sentence_id](connection_context, message)
            else:
                if self.missing_handlers is not None:
                    response = self.missing_handlers(connection_context, message)
            
            if self.message_post_handler is not None:
                return self.message_post_handler(connection_context, message, response)
            else:
                return response
        except ValueError:
            if self.bad_checksum_message_handler is not None:
                return self.bad_checksum_message_handler(connection_context, raw_message)
        except:
            if self.error_handler is not None:
                self.error_handler(connection_context)
        return None




    class MyTCPHandler(socketserver.StreamRequestHandler):
        """The StreamRequestHandler instance to use to create a NMEAServer"""
        
        connection_context = {}
        NMEAServer_instance = None
        
        def __init__(self, request, client_address, server, NMEAServer_instance):
            if NMEAServer_instance is None:
                raise ValueError('NMEAServer_instance cannot be None')

            self.NMEAServer_instance = NMEAServer_instance
            socketserver.StreamRequestHandler.__init__(self, request, client_address, server)

        def default_context(self):
            default_context = {}
            default_context['client_address'] = self.client_address[0]
            return default_context
        
        # read TCP message and use the NMEAServer.dispatch().
        def handle(self):
            context = self.default_context()
            if self.NMEAServer_instance.connection_context_creator is not None:
                self.connection_context = self.NMEAServer_instance.connection_context_creator(context)
            
            try:
                while not self.NMEAServer_instance.shutdown_flag:
                    received = self.rfile.readline().strip()
                    if self.NMEAServer_instance.debug:
                        print("< ", received)
                    response = self.NMEAServer_instance.dispatch(received, self.connection_context)
                    
                    if response is not None:
                        if self.NMEAServer_instance.debug:
                            print("> ", response)
                        self.wfile.write(formatSentence(response))
                        self.wfile.flush()
            except:
                import sys, traceback
                traceback.print_exc(file=sys.stdout)
                print("Connection closing")
    
    class ThreadedTCPServer(socketserver.ThreadingTCPServer):
        NMEAServer_instance = None
        
        def __init__(self, server_address, RequestHandlerClass, NMEAServer_instance):
            if NMEAServer_instance is None:
                raise ValueError('NMEAServer_instance cannot be None')
            
            socketserver.ThreadingTCPServer.__init__(self, server_address, RequestHandlerClass)
            self.NMEAServer_instance = NMEAServer_instance

            print('Server Address:', server_address[0])
            print('Connect to server on port:', server_address[1])

        def finish_request(self, request, client_address):
            """Finish one request by instantiating RequestHandlerClass."""
            self.RequestHandlerClass(request, client_address, self, self.NMEAServer_instance)


    def start(self):
        self.server = self.ThreadedTCPServer((self.host, self.port), NMEAServer.MyTCPHandler, self)
        server_thread = threading.Thread(name='nmeaserver', target = self.server.serve_forever)
        server_thread.daemon = True
        server_thread.start()

    def stop(self):
        self.shutdown_flag = True
        self.server.shutdown()